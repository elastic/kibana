/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MlTrainedModelDeploymentNodesStats,
  MlTrainedModelStats,
  SearchTotalHits,
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
import { AnalyticsServiceSetup, ElasticsearchClient } from '@kbn/core/server';
import { IndexPatternsFetcher } from '@kbn/data-views-plugin/server';
import { map } from 'lodash';
import { AIAssistantDataClient, AIAssistantDataClientParams } from '..';
import { GetElser } from '../../types';
import { createKnowledgeBaseEntry, transformToCreateSchema } from './create_knowledge_base_entry';
import { EsDocumentEntry, EsIndexEntry, EsKnowledgeBaseEntrySchema } from './types';
import { transformESSearchToKnowledgeBaseEntry } from './transforms';
import { SECURITY_LABS_RESOURCE, USER_RESOURCE } from '../../routes/knowledge_base/constants';
import {
  getKBVectorSearchQuery,
  getStructuredToolForIndexEntry,
  isModelAlreadyExistsError,
} from './helpers';
import { getKBUserFilter } from '../../routes/knowledge_base/entries/utils';
import {
  loadSecurityLabs,
  getSecurityLabsDocsCount,
} from '../../lib/langchain/content_loaders/security_labs_loader';
import { ASSISTANT_ELSER_INFERENCE_ID } from './field_maps_configuration';

/**
 * Params for when creating KbDataClient in Request Context Factory. Useful if needing to modify
 * configuration after initial plugin start
 */
export interface GetAIAssistantKnowledgeBaseDataClientParams {
  modelIdOverride?: string;
  manageGlobalKnowledgeBaseAIAssistant?: boolean;
}

export interface KnowledgeBaseDataClientParams extends AIAssistantDataClientParams {
  ml: MlPluginSetup;
  getElserId: GetElser;
  getIsKBSetupInProgress: () => boolean;
  ingestPipelineResourceName: string;
  setIsKBSetupInProgress: (isInProgress: boolean) => void;
  manageGlobalKnowledgeBaseAIAssistant: boolean;
}
export class AIAssistantKnowledgeBaseDataClient extends AIAssistantDataClient {
  constructor(public readonly options: KnowledgeBaseDataClientParams) {
    super(options);
  }

  public get isSetupInProgress() {
    return this.options.getIsKBSetupInProgress();
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
   * Checks if the inference endpoint is deployed and allocated in Elasticsearch
   *
   * @returns Promise<boolean> indicating whether the model is deployed
   */
  public isInferenceEndpointExists = async (): Promise<boolean> => {
    try {
      const esClient = await this.options.elasticsearchClientPromise;

      const inferenceExists = !!(await esClient.inference.get({
        inference_id: ASSISTANT_ELSER_INFERENCE_ID,
        task_type: 'sparse_embedding',
      }));
      if (!inferenceExists) {
        return false;
      }
      const elserId = await this.options.getElserId();
      const getResponse = await esClient.ml.getTrainedModelsStats({
        model_id: elserId,
      });

      // For standardized way of checking deployment status see: https://github.com/elastic/elasticsearch/issues/106986
      const isReadyESS = (stats: MlTrainedModelStats) =>
        stats.deployment_stats?.state === 'started' &&
        stats.deployment_stats?.allocation_status.state === 'fully_allocated';

      const isReadyServerless = (stats: MlTrainedModelStats) =>
        (stats.deployment_stats?.nodes as unknown as MlTrainedModelDeploymentNodesStats[])?.some(
          (node) => node.routing_state.routing_state === 'started'
        );

      return getResponse.trained_model_stats?.some(
        (stats) => isReadyESS(stats) || isReadyServerless(stats)
      );
    } catch (error) {
      this.options.logger.debug(
        `Error checking if Inference endpoint ${ASSISTANT_ELSER_INFERENCE_ID} exists: ${error}`
      );
      return false;
    }
  };

  public createInferenceEndpoint = async () => {
    const elserId = await this.options.getElserId();
    this.options.logger.debug(`Deploying ELSER model '${elserId}'...`);
    const esClient = await this.options.elasticsearchClientPromise;

    try {
      await esClient.inference.delete({
        inference_id: ASSISTANT_ELSER_INFERENCE_ID,
        // it's being used in the mapping so we need to force delete
        force: true,
      });
      this.options.logger.debug(`Deleted existing inference endpoint for ELSER model '${elserId}'`);
    } catch (error) {
      this.options.logger.error(
        `Error deleting inference endpoint for ELSER model '${elserId}':\n${error}`
      );
    }

    try {
      await esClient.inference.put({
        task_type: 'sparse_embedding',
        inference_id: ASSISTANT_ELSER_INFERENCE_ID,
        inference_config: {
          service: 'elasticsearch',
          service_settings: {
            adaptive_allocations: {
              enabled: true,
              min_number_of_allocations: 0,
              max_number_of_allocations: 8,
            },
            num_threads: 1,
            model_id: elserId,
          },
          task_settings: {},
        },
      });

      // await for the model to be deployed
      await this.isInferenceEndpointExists();
    } catch (error) {
      this.options.logger.error(
        `Error creating inference endpoint for ELSER model '${elserId}':\n${error}`
      );
      throw new Error(`Error creating inference endpoint for ELSER model '${elserId}':\n${error}`);
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
    ignoreSecurityLabs = false,
  }: {
    soClient: SavedObjectsClientContract;
    ignoreSecurityLabs?: boolean;
  }): Promise<void> => {
    if (this.options.getIsKBSetupInProgress()) {
      this.options.logger.debug('Knowledge Base setup already in progress');
      return;
    }

    this.options.logger.debug('Starting Knowledge Base setup...');
    this.options.setIsKBSetupInProgress(true);
    const elserId = await this.options.getElserId();

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
      // Delete any existing Security Labs content
      const securityLabsDocs = await esClient.deleteByQuery({
        index: this.indexTemplateAndPattern.alias,
        query: {
          bool: {
            must: [{ terms: { kb_resource: [SECURITY_LABS_RESOURCE] } }],
          },
        },
      });
      if (securityLabsDocs?.total) {
        this.options.logger.info(
          `Removed ${securityLabsDocs?.total} Security Labs knowledge base docs from knowledge base data stream: ${this.indexTemplateAndPattern.alias}.`
        );
      }
    } catch (e) {
      this.options.logger.info('No legacy ESQL or Security Labs knowledge base docs to delete');
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

      const inferenceExists = await this.isInferenceEndpointExists();
      if (!inferenceExists) {
        await this.createInferenceEndpoint();

        this.options.logger.debug(
          `Inference endpoint for ELSER model '${elserId}' successfully deployed!`
        );
      } else {
        this.options.logger.debug(
          `Inference endpoint for ELSER model '${elserId}' is already deployed`
        );
      }

      this.options.logger.debug(`Checking if Knowledge Base docs have been loaded...`);

      if (!ignoreSecurityLabs) {
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
    } finally {
      this.options.setIsKBSetupInProgress(false);
    }
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
    if (authenticatedUser == null) {
      throw new Error(
        'Authenticated user not found! Ensure kbDataClient was initialized from a request.'
      );
    }

    if (global && !this.options.manageGlobalKnowledgeBaseAIAssistant) {
      throw new Error('User lacks privileges to create global knowledge base entries');
    }

    const { errors, docs_created: docsCreated } = await writer.bulk({
      documentsToCreate: documents.map((doc) => {
        // v1 schema has metadata nested in a `metadata` object
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
    // Intentionally no telemetry here - this path only used to install security docs
    // Plans to make this function private in a different PR so no user entry ever is created in this path
    this.options.logger.debug(`created: ${created?.data.hits.hits.length ?? '0'}`);
    this.options.logger.debug(() => `errors: ${JSON.stringify(errors, null, 2)}`);

    return created?.data ? transformESSearchToKnowledgeBaseEntry(created?.data) : [];
  };

  /**
   * Returns if user's KB docs exists
   */

  public isUserDataExists = async (): Promise<boolean> => {
    const user = this.options.currentUser;
    if (user == null) {
      throw new Error(
        'Authenticated user not found! Ensure kbDataClient was initialized from a request.'
      );
    }

    const esClient = await this.options.elasticsearchClientPromise;

    try {
      const vectorSearchQuery = getKBVectorSearchQuery({
        kbResource: USER_RESOURCE,
        required: false,
        user,
      });

      const result = await esClient.search<EsDocumentEntry>({
        index: this.indexTemplateAndPattern.alias,
        size: 0,
        query: vectorSearchQuery,
        track_total_hits: true,
      });

      return !!(result.hits?.total as SearchTotalHits).value;
    } catch (e) {
      this.options.logger.debug(`Error checking if user's KB docs exist: ${e.message}`);
      return false;
    }
  };

  /**
   * Returns if allSecurity Labs KB docs have been loaded
   */
  public isSecurityLabsDocsLoaded = async (): Promise<boolean> => {
    const user = this.options.currentUser;
    if (user == null) {
      throw new Error(
        'Authenticated user not found! Ensure kbDataClient was initialized from a request.'
      );
    }

    const expectedDocsCount = await getSecurityLabsDocsCount({ logger: this.options.logger });

    const esClient = await this.options.elasticsearchClientPromise;

    try {
      const vectorSearchQuery = getKBVectorSearchQuery({
        kbResource: SECURITY_LABS_RESOURCE,
        required: false,
        user,
      });

      const result = await esClient.search<EsDocumentEntry>({
        index: this.indexTemplateAndPattern.alias,
        size: 0,
        query: vectorSearchQuery,
        track_total_hits: true,
      });

      const existingDocs = (result.hits?.total as SearchTotalHits).value;

      if (existingDocs !== expectedDocsCount) {
        this.options.logger.debug(
          `Security Labs docs are not loaded, existing docs: ${existingDocs}, expected docs: ${expectedDocsCount}`
        );
      }
      return existingDocs === expectedDocsCount;
    } catch (e) {
      this.options.logger.info(`Error checking if Security Labs docs are loaded: ${e.message}`);
      return false;
    }
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

    const vectorSearchQuery = getKBVectorSearchQuery({
      filter,
      kbResource,
      query,
      required,
      user,
    });

    try {
      const result = await esClient.search<EsDocumentEntry>({
        index: this.indexTemplateAndPattern.alias,
        size: 10,
        query: vectorSearchQuery,
      });

      const results = result.hits.hits.map((hit) => {
        const metadata = {
          source: hit?._source?.source,
          required: hit?._source?.required,
          kbResource: hit?._source?.kb_resource,
        };
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
    telemetry,
    global = false,
  }: {
    knowledgeBaseEntry: KnowledgeBaseEntryCreateProps;
    global?: boolean;
    telemetry: AnalyticsServiceSetup;
  }): Promise<KnowledgeBaseEntryResponse | null> => {
    const authenticatedUser = this.options.currentUser;

    if (authenticatedUser == null) {
      throw new Error(
        'Authenticated user not found! Ensure kbDataClient was initialized from a request.'
      );
    }

    if (global && !this.options.manageGlobalKnowledgeBaseAIAssistant) {
      throw new Error('User lacks privileges to create global knowledge base entries');
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
      telemetry,
    });
  };

  /**
   * Returns AssistantTools for any 'relevant' KB IndexEntries that exist in the knowledge base.
   *
   * Note: Accepts esClient so retrieval can be scoped to the current user as esClient on kbDataClient
   * is scoped to system user.
   */
  public getAssistantTools = async ({
    esClient,
  }: {
    esClient: ElasticsearchClient;
  }): Promise<StructuredTool[]> => {
    const user = this.options.currentUser;
    if (user == null) {
      throw new Error(
        'Authenticated user not found! Ensure kbDataClient was initialized from a request.'
      );
    }

    try {
      const elserId = ASSISTANT_ELSER_INFERENCE_ID;
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
        const indexPatternFetcher = new IndexPatternsFetcher(esClient);
        const existingIndices = await indexPatternFetcher.getExistingIndices(map(entries, 'index'));
        return (
          entries
            // Filter out any IndexEntries that don't have an existing index
            .filter((entry) => existingIndices.includes(entry.index))
            .map((indexEntry) => {
              return getStructuredToolForIndexEntry({
                indexEntry,
                esClient,
                logger: this.options.logger,
                elserId,
              });
            })
        );
      }
    } catch (e) {
      this.options.logger.error(`kbDataClient.getAssistantTools() - Failed to fetch IndexEntries`);
      return [];
    }

    return [];
  };
}
