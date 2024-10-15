/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MlTrainedModelDeploymentNodesStats,
  MlTrainedModelStats,
} from '@elastic/elasticsearch/lib/api/types';
import type { MlPluginSetup } from '@kbn/ml-plugin/server';
import type { KibanaRequest } from '@kbn/core-http-server';
import { Document } from 'langchain/document';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import {
  DocumentEntryType,
  DocumentEntry,
  IndexEntry,
  KnowledgeBaseEntryCreateProps,
  KnowledgeBaseEntryResponse,
  Metadata,
} from '@kbn/elastic-assistant-common';
import pRetry from 'p-retry';
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { StructuredTool } from '@langchain/core/tools';
import { ElasticsearchClient } from '@kbn/core/server';
import { AIAssistantDataClient, AIAssistantDataClientParams } from '..';
import { AssistantToolParams, GetElser } from '../../types';
import {
  createKnowledgeBaseEntry,
  LegacyKnowledgeBaseEntryCreateProps,
  transformToCreateSchema,
  transformToLegacyCreateSchema,
} from './create_knowledge_base_entry';
import { EsDocumentEntry, EsIndexEntry, EsKnowledgeBaseEntrySchema } from './types';
import { transformESSearchToKnowledgeBaseEntry } from './transforms';
import {
  ESQL_DOCS_LOADED_QUERY,
  SECURITY_LABS_RESOURCE,
} from '../../routes/knowledge_base/constants';
import {
  getKBVectorSearchQuery,
  getStructuredToolForIndexEntry,
  isModelAlreadyExistsError,
} from './helpers';
import { getKBUserFilter } from '../../routes/knowledge_base/entries/utils';
import { loadSecurityLabs } from '../../lib/langchain/content_loaders/security_labs_loader';

/**
 * Params for when creating KbDataClient in Request Context Factory. Useful if needing to modify
 * configuration after initial plugin start
 */
export interface GetAIAssistantKnowledgeBaseDataClientParams {
  modelIdOverride?: string;
  v2KnowledgeBaseEnabled?: boolean;
}

interface KnowledgeBaseDataClientParams extends AIAssistantDataClientParams {
  ml: MlPluginSetup;
  getElserId: GetElser;
  getIsKBSetupInProgress: () => boolean;
  ingestPipelineResourceName: string;
  setIsKBSetupInProgress: (isInProgress: boolean) => void;
  v2KnowledgeBaseEnabled: boolean;
}
export class AIAssistantKnowledgeBaseDataClient extends AIAssistantDataClient {
  constructor(public readonly options: KnowledgeBaseDataClientParams) {
    super(options);
  }

  public get isSetupInProgress() {
    return this.options.getIsKBSetupInProgress();
  }

  public get isV2KnowledgeBaseEnabled() {
    return this.options.v2KnowledgeBaseEnabled;
  }

  /**
   * Returns whether setup of the Knowledge Base can be performed (essentially an ML features check)
   *
   */
  public isSetupAvailable = async () => {
    // ML plugin requires request to retrieve capabilities, which are in turn scoped to the user from the request,
    // so we just test the API for a 404 instead to determine if ML is 'available'
    // TODO: expand to include memory check, see https://github.com/elastic/ml-team/issues/1208#issuecomment-2115770318
    try {
      const esClient = await this.options.elasticsearchClientPromise;
      await esClient.ml.getMemoryStats({ human: true });
    } catch (error) {
      return false;
    }
    return true;
  };

  /**
   * Downloads and installs ELSER model if not already installed
   *
   * @param soClient SavedObjectsClientContract for installing ELSER so that ML SO's are in sync
   */
  private installModel = async ({ soClient }: { soClient: SavedObjectsClientContract }) => {
    const elserId = await this.options.getElserId();
    this.options.logger.debug(`Installing ELSER model '${elserId}'...`);

    try {
      await this.options.ml
        // TODO: Potentially plumb soClient through DataClient from pluginStart
        .trainedModelsProvider({} as KibanaRequest, soClient)
        .installElasticModel(elserId);
    } catch (error) {
      this.options.logger.error(`Error installing ELSER model '${elserId}':\n${error}`);
    }
  };

  /**
   * Returns whether ELSER is installed/ready to deploy
   *
   * @returns Promise<boolean> indicating whether the model is installed
   */
  public isModelInstalled = async (): Promise<boolean> => {
    const elserId = await this.options.getElserId();
    this.options.logger.debug(`Checking if ELSER model '${elserId}' is installed...`);

    try {
      const esClient = await this.options.elasticsearchClientPromise;
      const getResponse = await esClient.ml.getTrainedModels({
        model_id: elserId,
        include: 'definition_status',
      });
      return Boolean(getResponse.trained_model_configs[0]?.fully_defined);
    } catch (error) {
      if (!isModelAlreadyExistsError(error)) {
        this.options.logger.error(
          `Error checking if ELSER model '${elserId}' is installed:\n${error}`
        );
      }
      return false;
    }
  };

  /**
   * Deploy the ELSER model with default configuration
   */
  private deployModel = async () => {
    const elserId = await this.options.getElserId();
    this.options.logger.debug(`Deploying ELSER model '${elserId}'...`);
    try {
      const esClient = await this.options.elasticsearchClientPromise;
      await esClient.ml.startTrainedModelDeployment({
        model_id: elserId,
        wait_for: 'fully_allocated',
      });
    } catch (error) {
      this.options.logger.error(`Error deploying ELSER model '${elserId}':\n${error}`);
      throw new Error(`Error deploying ELSER model '${elserId}':\n${error}`);
    }
  };

  /**
   * Checks if the provided model is deployed and allocated in Elasticsearch
   *
   * @returns Promise<boolean> indicating whether the model is deployed
   */
  public isModelDeployed = async (): Promise<boolean> => {
    const elserId = await this.options.getElserId();
    this.options.logger.debug(`Checking if ELSER model '${elserId}' is deployed...`);

    try {
      const esClient = await this.options.elasticsearchClientPromise;
      const getResponse = await esClient.ml.getTrainedModelsStats({
        model_id: elserId,
      });

      // For standardized way of checking deployment status see: https://github.com/elastic/elasticsearch/issues/106986
      const isReadyESS = (stats: MlTrainedModelStats) =>
        stats.deployment_stats?.state === 'started' &&
        stats.deployment_stats?.allocation_status.state === 'fully_allocated';

      const isReadyServerless = (stats: MlTrainedModelStats) =>
        (stats.deployment_stats?.nodes as unknown as MlTrainedModelDeploymentNodesStats[]).some(
          (node) => node.routing_state.routing_state === 'started'
        );

      return getResponse.trained_model_stats.some(
        (stats) => isReadyESS(stats) || isReadyServerless(stats)
      );
    } catch (e) {
      // Returns 404 if it doesn't exist
      return false;
    }
  };

  /**
   * Downloads and deploys recommended ELSER (if not already), then loads ES|QL docs
   *
   * NOTE: Before automatically installing ELSER in the background, we should perform deployment resource checks
   * Only necessary for ESS, as Serverless can always auto-install if `productTier === complete`
   * See ml-team issue for providing 'dry run' flag to perform these checks: https://github.com/elastic/ml-team/issues/1208
   *
   * @param options
   * @param options.soClient SavedObjectsClientContract for installing ELSER so that ML SO's are in sync
   *
   * @returns Promise<void>
   */
  public setupKnowledgeBase = async ({
    soClient,
    v2KnowledgeBaseEnabled = true,
  }: {
    soClient: SavedObjectsClientContract;
    v2KnowledgeBaseEnabled?: boolean;
  }): Promise<void> => {
    if (this.options.getIsKBSetupInProgress()) {
      this.options.logger.debug('Knowledge Base setup already in progress');
      return;
    }

    this.options.logger.debug('Starting Knowledge Base setup...');
    this.options.setIsKBSetupInProgress(true);
    const elserId = await this.options.getElserId();

    if (v2KnowledgeBaseEnabled) {
      // Delete legacy ESQL knowledge base docs if they exist, and silence the error if they do not
      try {
        const esClient = await this.options.elasticsearchClientPromise;
        const legacyESQL = await esClient.deleteByQuery({
          index: this.indexTemplateAndPattern.alias,
          query: {
            bool: {
              must: [{ terms: { 'metadata.kbResource': ['esql', 'unknown'] } }],
            },
          },
        });
        if (legacyESQL?.total != null && legacyESQL?.total > 0) {
          this.options.logger.info(
            `Removed ${legacyESQL?.total} ESQL knowledge base docs from knowledge base data stream: ${this.indexTemplateAndPattern.alias}.`
          );
        }
      } catch (e) {
        this.options.logger.info('No legacy ESQL knowledge base docs to delete');
      }
    }

    try {
      const isInstalled = await this.isModelInstalled();
      if (!isInstalled) {
        await this.installModel({ soClient });
        await pRetry(
          async () =>
            (await this.isModelInstalled())
              ? Promise.resolve()
              : Promise.reject(new Error('Model not installed')),
          { minTimeout: 10000, maxTimeout: 10000, retries: 10 }
        );
        this.options.logger.debug(`ELSER model '${elserId}' successfully installed!`);
      } else {
        this.options.logger.debug(`ELSER model '${elserId}' is already installed`);
      }

      const isDeployed = await this.isModelDeployed();
      if (!isDeployed) {
        await this.deployModel();
        await pRetry(
          async () =>
            (await this.isModelDeployed())
              ? Promise.resolve()
              : Promise.reject(new Error('Model not deployed')),
          { minTimeout: 2000, retries: 10 }
        );
        this.options.logger.debug(`ELSER model '${elserId}' successfully deployed!`);
      } else {
        this.options.logger.debug(`ELSER model '${elserId}' is already deployed`);
      }

      this.options.logger.debug(`Checking if Knowledge Base docs have been loaded...`);

      if (v2KnowledgeBaseEnabled) {
        const labsDocsLoaded = await this.isSecurityLabsDocsLoaded();
        if (!labsDocsLoaded) {
          this.options.logger.debug(`Loading Security Labs KB docs...`);
          await loadSecurityLabs(this, this.options.logger);
        } else {
          this.options.logger.debug(`Security Labs Knowledge Base docs already loaded!`);
        }
      }
    } catch (e) {
      this.options.setIsKBSetupInProgress(false);
      this.options.logger.error(`Error setting up Knowledge Base: ${e.message}`);
      throw new Error(`Error setting up Knowledge Base: ${e.message}`);
    }
    this.options.setIsKBSetupInProgress(false);
  };

  /**
   * Adds LangChain Documents to the knowledge base
   *
   * @param {Array<Document<Metadata>>} documents - LangChain Documents to add to the knowledge base
   * @param global whether these entries should be added globally, i.e. empty users[]
   */
  public addKnowledgeBaseDocuments = async ({
    documents,
    global = false,
  }: {
    documents: Array<Document<Metadata>>;
    global?: boolean;
  }): Promise<KnowledgeBaseEntryResponse[]> => {
    const writer = await this.getWriter();
    const changedAt = new Date().toISOString();
    const authenticatedUser = this.options.currentUser;
    // TODO: KB-RBAC check for when `global:true`
    if (authenticatedUser == null) {
      throw new Error(
        'Authenticated user not found! Ensure kbDataClient was initialized from a request.'
      );
    }
    const { errors, docs_created: docsCreated } = await writer.bulk({
      documentsToCreate: documents.map((doc) => {
        // v1 schema has metadata nested in a `metadata` object
        if (this.options.v2KnowledgeBaseEnabled) {
          return transformToCreateSchema({
            createdAt: changedAt,
            spaceId: this.spaceId,
            user: authenticatedUser,
            entry: {
              type: DocumentEntryType.value,
              name: 'unknown',
              text: doc.pageContent,
              kbResource: doc.metadata.kbResource ?? 'unknown',
              required: doc.metadata.required ?? false,
              source: doc.metadata.source ?? 'unknown',
            },
            global,
          });
        } else {
          return transformToLegacyCreateSchema({
            createdAt: changedAt,
            spaceId: this.spaceId,
            user: authenticatedUser,
            entry: {
              type: DocumentEntryType.value,
              name: 'unknown',
              text: doc.pageContent,
              metadata: {
                kbResource: doc.metadata.kbResource ?? 'unknown',
                required: doc.metadata.required ?? false,
                source: doc.metadata.source ?? 'unknown',
              },
            },
            global,
          });
        }
      }),
      authenticatedUser,
    });
    const created =
      docsCreated.length > 0
        ? await this.findDocuments<EsKnowledgeBaseEntrySchema>({
            page: 1,
            perPage: 10000,
            filter: docsCreated.map((c) => `_id:${c}`).join(' OR '),
          })
        : undefined;
    this.options.logger.debug(`created: ${created?.data.hits.hits.length ?? '0'}`);
    this.options.logger.debug(() => `errors: ${JSON.stringify(errors, null, 2)}`);

    return created?.data ? transformESSearchToKnowledgeBaseEntry(created?.data) : [];
  };

  /**
   * Returns if ES|QL KB docs have been loaded
   */
  public isESQLDocsLoaded = async (): Promise<boolean> => {
    const esqlDocs = await this.getKnowledgeBaseDocumentEntries({
      query: ESQL_DOCS_LOADED_QUERY,
      // kbResource, // Note: `8.15` installs have kbResource as `unknown`, so don't filter yet
      required: true,
    });
    return esqlDocs.length > 0;
  };

  /**
   * Returns if Security Labs KB docs have been loaded
   */
  public isSecurityLabsDocsLoaded = async (): Promise<boolean> => {
    const securityLabsDocs = await this.getKnowledgeBaseDocumentEntries({
      query: '',
      kbResource: SECURITY_LABS_RESOURCE,
      required: false,
    });
    return securityLabsDocs.length > 0;
  };

  /**
   * Performs similarity search to retrieve LangChain Documents from the knowledge base
   */
  public getKnowledgeBaseDocumentEntries = async ({
    filter,
    kbResource,
    query,
    required,
  }: {
    filter?: QueryDslQueryContainer;
    kbResource?: string;
    query: string;
    required?: boolean;
  }): Promise<Document[]> => {
    const user = this.options.currentUser;
    if (user == null) {
      throw new Error(
        'Authenticated user not found! Ensure kbDataClient was initialized from a request.'
      );
    }

    const esClient = await this.options.elasticsearchClientPromise;
    const modelId = await this.options.getElserId();

    const vectorSearchQuery = getKBVectorSearchQuery({
      filter,
      kbResource,
      modelId,
      query,
      required,
      user,
      v2KnowledgeBaseEnabled: this.options.v2KnowledgeBaseEnabled,
    });

    try {
      const result = await esClient.search<EsDocumentEntry>({
        index: this.indexTemplateAndPattern.alias,
        size: 10,
        query: vectorSearchQuery,
      });

      const results = result.hits.hits.map((hit) => {
        const metadata = this.options.v2KnowledgeBaseEnabled
          ? {
              source: hit?._source?.source,
              required: hit?._source?.required,
              kbResource: hit?._source?.kb_resource,
            }
          : // @ts-ignore v1 schema has metadata nested in a `metadata` object and kbResource vs kb_resource
            hit?._source?.metadata ?? {};
        return new Document({
          pageContent: hit?._source?.text ?? '',
          metadata,
        });
      });

      this.options.logger.debug(
        () =>
          `getKnowledgeBaseDocuments() - Similarity Search Query:\n ${JSON.stringify(
            vectorSearchQuery
          )}`
      );
      this.options.logger.debug(
        () =>
          `getKnowledgeBaseDocuments() - Similarity Search returned [${JSON.stringify(
            results.length
          )}] results`
      );

      return results;
    } catch (e) {
      this.options.logger.error(`Error performing KB Similarity Search: ${e.message}`);
      return [];
    }
  };

  /**
   * Returns all global and current user's private `required` document entries.
   */
  public getRequiredKnowledgeBaseDocumentEntries = async (): Promise<DocumentEntry[]> => {
    const user = this.options.currentUser;
    if (user == null) {
      throw new Error(
        'Authenticated user not found! Ensure kbDataClient was initialized from a request.'
      );
    }

    try {
      const userFilter = getKBUserFilter(user);
      const results = await this.findDocuments<EsIndexEntry>({
        // Note: This is a magic number to set some upward bound as to not blow the context with too
        // many historical KB entries. Ideally we'd query for all and token trim.
        perPage: 100,
        page: 1,
        sortField: 'created_at',
        sortOrder: 'asc',
        filter: `${userFilter} AND type:document AND kb_resource:user AND required:true`,
      });
      this.options.logger.debug(
        `kbDataClient.getRequiredKnowledgeBaseDocumentEntries() - results:\n${JSON.stringify(
          results
        )}`
      );

      if (results) {
        return transformESSearchToKnowledgeBaseEntry(results.data) as DocumentEntry[];
      }
    } catch (e) {
      this.options.logger.error(
        `kbDataClient.getRequiredKnowledgeBaseDocumentEntries() - Failed to fetch DocumentEntries`
      );
      return [];
    }

    return [];
  };

  /**
   * Creates a new Knowledge Base Entry.
   *
   * @param knowledgeBaseEntry
   * @param global
   */
  public createKnowledgeBaseEntry = async ({
    knowledgeBaseEntry,
    global = false,
  }: {
    knowledgeBaseEntry: KnowledgeBaseEntryCreateProps | LegacyKnowledgeBaseEntryCreateProps;
    global?: boolean;
  }): Promise<KnowledgeBaseEntryResponse | null> => {
    const authenticatedUser = this.options.currentUser;
    // TODO: KB-RBAC check for when `global:true`
    if (authenticatedUser == null) {
      throw new Error(
        'Authenticated user not found! Ensure kbDataClient was initialized from a request.'
      );
    }
    this.options.logger.debug(
      () => `Creating Knowledge Base Entry:\n ${JSON.stringify(knowledgeBaseEntry, null, 2)}`
    );
    this.options.logger.debug(`kbIndex: ${this.indexTemplateAndPattern.alias}`);
    const esClient = await this.options.elasticsearchClientPromise;
    return createKnowledgeBaseEntry({
      esClient,
      knowledgeBaseIndex: this.indexTemplateAndPattern.alias,
      logger: this.options.logger,
      spaceId: this.spaceId,
      user: authenticatedUser,
      knowledgeBaseEntry,
      global,
      isV2: this.options.v2KnowledgeBaseEnabled,
    });
  };

  /**
   * Returns AssistantTools for any 'relevant' KB IndexEntries that exist in the knowledge base.
   *
   * Note: Accepts esClient so retrieval can be scoped to the current user as esClient on kbDataClient
   * is scoped to system user.
   */
  public getAssistantTools = async ({
    assistantToolParams,
    esClient,
  }: {
    assistantToolParams: AssistantToolParams;
    esClient: ElasticsearchClient;
  }): Promise<StructuredTool[]> => {
    const user = this.options.currentUser;
    if (user == null) {
      throw new Error(
        'Authenticated user not found! Ensure kbDataClient was initialized from a request.'
      );
    }

    try {
      const elserId = await this.options.getElserId();
      const userFilter = getKBUserFilter(user);
      const results = await this.findDocuments<EsIndexEntry>({
        // Note: This is a magic number to set some upward bound as to not blow the context with too
        // many registered tools. As discussed in review, this will initially be mitigated by caps on
        // the IndexEntries field lengths, context trimming at the graph layer (before compilation),
        // and eventually some sort of tool discovery sub-graph or generic retriever to scale tool usage.
        perPage: 23,
        page: 1,
        sortField: 'created_at',
        sortOrder: 'asc',
        filter: `${userFilter} AND type:index`,
      });
      this.options.logger.debug(
        `kbDataClient.getAssistantTools() - results:\n${JSON.stringify(results, null, 2)}`
      );

      if (results) {
        const entries = transformESSearchToKnowledgeBaseEntry(results.data) as IndexEntry[];
        return entries.map((indexEntry) => {
          return getStructuredToolForIndexEntry({
            indexEntry,
            esClient,
            logger: this.options.logger,
            elserId,
          });
        });
      }
    } catch (e) {
      this.options.logger.error(`kbDataClient.getAssistantTools() - Failed to fetch IndexEntries`);
      return [];
    }

    return [];
  };
}
