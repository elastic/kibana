/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataStreamSpacesAdapter, FieldMap } from '@kbn/data-stream-adapter';
import { DEFAULT_NAMESPACE_STRING } from '@kbn/core-saved-objects-utils-server';
import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import type { TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';
import type { MlPluginSetup } from '@kbn/ml-plugin/server';
import { AuthenticatedUser } from '@kbn/security-plugin/server';
import { Subject } from 'rxjs';
import { attackDiscoveryFieldMap } from '../ai_assistant_data_clients/attack_discovery/field_maps_configuration';
import { getDefaultAnonymizationFields } from '../../common/anonymization';
import { AssistantResourceNames, GetElser } from '../types';
import { AIAssistantConversationsDataClient } from '../ai_assistant_data_clients/conversations';
import {
  InitializationPromise,
  ResourceInstallationHelper,
  createResourceInstallationHelper,
  errorResult,
  successResult,
} from './create_resource_installation_helper';
import { conversationsFieldMap } from '../ai_assistant_data_clients/conversations/field_maps_configuration';
import { assistantPromptsFieldMap } from '../ai_assistant_data_clients/prompts/field_maps_configuration';
import { assistantAnonymizationFieldsFieldMap } from '../ai_assistant_data_clients/anonymization_fields/field_maps_configuration';
import { AIAssistantDataClient } from '../ai_assistant_data_clients';
import { knowledgeBaseFieldMap } from '../ai_assistant_data_clients/knowledge_base/field_maps_configuration';
import { AIAssistantKnowledgeBaseDataClient } from '../ai_assistant_data_clients/knowledge_base';
import { AttackDiscoveryDataClient } from '../ai_assistant_data_clients/attack_discovery';
import { createGetElserId, createPipeline, pipelineExists } from './helpers';

const TOTAL_FIELDS_LIMIT = 2500;

function getResourceName(resource: string) {
  return `.kibana-elastic-ai-assistant-${resource}`;
}

export interface AIAssistantServiceOpts {
  logger: Logger;
  kibanaVersion: string;
  elasticsearchClientPromise: Promise<ElasticsearchClient>;
  ml: MlPluginSetup;
  taskManager: TaskManagerSetupContract;
  pluginStop$: Subject<void>;
}

export interface CreateAIAssistantClientParams {
  logger: Logger;
  spaceId: string;
  currentUser: AuthenticatedUser | null;
}

export type CreateDataStream = (params: {
  resource:
    | 'anonymizationFields'
    | 'conversations'
    | 'knowledgeBase'
    | 'prompts'
    | 'attackDiscovery';
  fieldMap: FieldMap;
  kibanaVersion: string;
  spaceId?: string;
}) => DataStreamSpacesAdapter;

export class AIAssistantService {
  private initialized: boolean;
  // Temporary 'feature flag' to determine if we should initialize the knowledge base, toggled when accessing data client
  private initializeKnowledgeBase: boolean = false;
  private isInitializing: boolean = false;
  private getElserId: GetElser;
  private conversationsDataStream: DataStreamSpacesAdapter;
  private knowledgeBaseDataStream: DataStreamSpacesAdapter;
  private promptsDataStream: DataStreamSpacesAdapter;
  private anonymizationFieldsDataStream: DataStreamSpacesAdapter;
  private attackDiscoveryDataStream: DataStreamSpacesAdapter;
  private resourceInitializationHelper: ResourceInstallationHelper;
  private initPromise: Promise<InitializationPromise>;
  private isKBSetupInProgress: boolean = false;

  constructor(private readonly options: AIAssistantServiceOpts) {
    this.initialized = false;
    this.getElserId = createGetElserId(options.ml);
    this.conversationsDataStream = this.createDataStream({
      resource: 'conversations',
      kibanaVersion: options.kibanaVersion,
      fieldMap: conversationsFieldMap,
    });
    this.knowledgeBaseDataStream = this.createDataStream({
      resource: 'knowledgeBase',
      kibanaVersion: options.kibanaVersion,
      fieldMap: knowledgeBaseFieldMap,
    });
    this.promptsDataStream = this.createDataStream({
      resource: 'prompts',
      kibanaVersion: options.kibanaVersion,
      fieldMap: assistantPromptsFieldMap,
    });
    this.anonymizationFieldsDataStream = this.createDataStream({
      resource: 'anonymizationFields',
      kibanaVersion: options.kibanaVersion,
      fieldMap: assistantAnonymizationFieldsFieldMap,
    });
    this.attackDiscoveryDataStream = this.createDataStream({
      resource: 'attackDiscovery',
      kibanaVersion: options.kibanaVersion,
      fieldMap: attackDiscoveryFieldMap,
    });

    this.initPromise = this.initializeResources();

    this.resourceInitializationHelper = createResourceInstallationHelper(
      this.options.logger,
      this.initPromise,
      this.installAndUpdateSpaceLevelResources.bind(this)
    );
  }

  public isInitialized() {
    return this.initialized;
  }

  public getIsKBSetupInProgress() {
    return this.isKBSetupInProgress;
  }
  public setIsKBSetupInProgress(isInProgress: boolean) {
    this.isKBSetupInProgress = isInProgress;
  }

  private createDataStream: CreateDataStream = ({ resource, kibanaVersion, fieldMap }) => {
    const newDataStream = new DataStreamSpacesAdapter(this.resourceNames.aliases[resource], {
      kibanaVersion,
      totalFieldsLimit: TOTAL_FIELDS_LIMIT,
    });

    newDataStream.setComponentTemplate({
      name: this.resourceNames.componentTemplate[resource],
      fieldMap,
    });

    newDataStream.setIndexTemplate({
      name: this.resourceNames.indexTemplate[resource],
      componentTemplateRefs: [this.resourceNames.componentTemplate[resource]],
      // Apply `default_pipeline` if pipeline exists for resource
      ...(resource in this.resourceNames.pipelines
        ? {
            template: {
              settings: {
                'index.default_pipeline':
                  this.resourceNames.pipelines[
                    resource as keyof typeof this.resourceNames.pipelines
                  ],
              },
            },
          }
        : {}),
    });

    return newDataStream;
  };

  private async initializeResources(): Promise<InitializationPromise> {
    this.isInitializing = true;
    try {
      this.options.logger.debug(`Initializing resources for AIAssistantService`);
      const esClient = await this.options.elasticsearchClientPromise;

      await this.conversationsDataStream.install({
        esClient,
        logger: this.options.logger,
        pluginStop$: this.options.pluginStop$,
      });

      if (this.initializeKnowledgeBase) {
        await this.knowledgeBaseDataStream.install({
          esClient,
          logger: this.options.logger,
          pluginStop$: this.options.pluginStop$,
        });

        // TODO: Pipeline creation is temporary as we'll be moving to semantic_text field once available in ES
        const pipelineCreated = await pipelineExists({
          esClient,
          id: this.resourceNames.pipelines.knowledgeBase,
        });
        if (!pipelineCreated) {
          this.options.logger.debug(
            `Installing ingest pipeline - ${this.resourceNames.pipelines.knowledgeBase}`
          );
          const response = await createPipeline({
            esClient,
            id: this.resourceNames.pipelines.knowledgeBase,
            modelId: await this.getElserId(),
          });

          this.options.logger.debug(`Installed ingest pipeline: ${response}`);
        } else {
          this.options.logger.debug(
            `Ingest pipeline already exists - ${this.resourceNames.pipelines.knowledgeBase}`
          );
        }
      }

      await this.promptsDataStream.install({
        esClient,
        logger: this.options.logger,
        pluginStop$: this.options.pluginStop$,
      });

      await this.anonymizationFieldsDataStream.install({
        esClient,
        logger: this.options.logger,
        pluginStop$: this.options.pluginStop$,
      });

      await this.attackDiscoveryDataStream.install({
        esClient,
        logger: this.options.logger,
        pluginStop$: this.options.pluginStop$,
      });
    } catch (error) {
      this.options.logger.error(`Error initializing AI assistant resources: ${error.message}`);
      this.initialized = false;
      this.isInitializing = false;
      return errorResult(error.message);
    }
    this.initialized = true;
    this.isInitializing = false;
    return successResult();
  }

  private readonly resourceNames: AssistantResourceNames = {
    componentTemplate: {
      conversations: getResourceName('component-template-conversations'),
      knowledgeBase: getResourceName('component-template-knowledge-base'),
      prompts: getResourceName('component-template-prompts'),
      anonymizationFields: getResourceName('component-template-anonymization-fields'),
      attackDiscovery: getResourceName('component-template-attack-discovery'),
    },
    aliases: {
      conversations: getResourceName('conversations'),
      knowledgeBase: getResourceName('knowledge-base'),
      prompts: getResourceName('prompts'),
      anonymizationFields: getResourceName('anonymization-fields'),
      attackDiscovery: getResourceName('attack-discovery'),
    },
    indexPatterns: {
      conversations: getResourceName('conversations*'),
      knowledgeBase: getResourceName('knowledge-base*'),
      prompts: getResourceName('prompts*'),
      anonymizationFields: getResourceName('anonymization-fields*'),
      attackDiscovery: getResourceName('attack-discovery*'),
    },
    indexTemplate: {
      conversations: getResourceName('index-template-conversations'),
      knowledgeBase: getResourceName('index-template-knowledge-base'),
      prompts: getResourceName('index-template-prompts'),
      anonymizationFields: getResourceName('index-template-anonymization-fields'),
      attackDiscovery: getResourceName('index-template-attack-discovery'),
    },
    pipelines: {
      knowledgeBase: getResourceName('ingest-pipeline-knowledge-base'),
    },
  };

  private async checkResourcesInstallation(opts: CreateAIAssistantClientParams) {
    // Check if resources installation has succeeded
    const { result: initialized, error } = await this.getSpaceResourcesInitializationPromise(
      opts.spaceId
    );

    // If space level resources initialization failed, retry
    if (!initialized && error) {
      let initRetryPromise: Promise<InitializationPromise> | undefined;

      // If !this.initialized, we know that resource initialization failed
      // and we need to retry this before retrying the spaceId specific resources
      if (!this.initialized) {
        if (!this.isInitializing) {
          this.options.logger.info(`Retrying common resource initialization`);
          initRetryPromise = this.initializeResources();
        } else {
          this.options.logger.info(
            `Skipped retrying common resource initialization because it is already being retried.`
          );
        }
      }

      this.resourceInitializationHelper.retry(opts.spaceId, initRetryPromise);

      const retryResult = await this.resourceInitializationHelper.getInitializedResources(
        opts.spaceId ?? DEFAULT_NAMESPACE_STRING
      );

      if (!retryResult.result) {
        const errorLogPrefix = `There was an error in the framework installing spaceId-level resources and creating concrete indices for spaceId "${opts.spaceId}" - `;
        // Retry also failed
        this.options.logger.warn(
          retryResult.error && error
            ? `${errorLogPrefix}Retry failed with errors: ${error}`
            : `${errorLogPrefix}Original error: ${error}; Error after retry: ${retryResult.error}`
        );
        return null;
      } else {
        this.options.logger.info(
          `Resource installation for "${opts.spaceId}" succeeded after retry`
        );
      }
    }
  }

  public async createAIAssistantConversationsDataClient(
    opts: CreateAIAssistantClientParams
  ): Promise<AIAssistantConversationsDataClient | null> {
    const res = await this.checkResourcesInstallation(opts);

    if (res === null) {
      return null;
    }

    return new AIAssistantConversationsDataClient({
      logger: this.options.logger,
      elasticsearchClientPromise: this.options.elasticsearchClientPromise,
      spaceId: opts.spaceId,
      kibanaVersion: this.options.kibanaVersion,
      indexPatternsResourceName: this.resourceNames.aliases.conversations,
      currentUser: opts.currentUser,
    });
  }

  public async createAIAssistantKnowledgeBaseDataClient(
    opts: CreateAIAssistantClientParams & { initializeKnowledgeBase: boolean }
  ): Promise<AIAssistantKnowledgeBaseDataClient | null> {
    // Note: Due to plugin lifecycle and feature flag registration timing, we need to pass in the feature flag here
    // Remove this param and initialization when the `assistantKnowledgeBaseByDefault` feature flag is removed
    if (opts.initializeKnowledgeBase) {
      this.initializeKnowledgeBase = true;
      await this.initializeResources();
    }

    const res = await this.checkResourcesInstallation(opts);

    if (res === null) {
      return null;
    }

    return new AIAssistantKnowledgeBaseDataClient({
      logger: this.options.logger.get('knowledgeBase'),
      currentUser: opts.currentUser,
      elasticsearchClientPromise: this.options.elasticsearchClientPromise,
      indexPatternsResourceName: this.resourceNames.aliases.knowledgeBase,
      ingestPipelineResourceName: this.resourceNames.pipelines.knowledgeBase,
      getElserId: this.getElserId,
      getIsKBSetupInProgress: this.getIsKBSetupInProgress.bind(this),
      kibanaVersion: this.options.kibanaVersion,
      ml: this.options.ml,
      setIsKBSetupInProgress: this.setIsKBSetupInProgress.bind(this),
      spaceId: opts.spaceId,
    });
  }

  public async createAttackDiscoveryDataClient(
    opts: CreateAIAssistantClientParams
  ): Promise<AttackDiscoveryDataClient | null> {
    const res = await this.checkResourcesInstallation(opts);

    if (res === null) {
      return null;
    }

    return new AttackDiscoveryDataClient({
      logger: this.options.logger.get('attackDiscovery'),
      currentUser: opts.currentUser,
      elasticsearchClientPromise: this.options.elasticsearchClientPromise,
      indexPatternsResourceName: this.resourceNames.aliases.attackDiscovery,
      kibanaVersion: this.options.kibanaVersion,
      spaceId: opts.spaceId,
    });
  }

  public async createAIAssistantPromptsDataClient(
    opts: CreateAIAssistantClientParams
  ): Promise<AIAssistantDataClient | null> {
    const res = await this.checkResourcesInstallation(opts);

    if (res === null) {
      return null;
    }

    return new AIAssistantDataClient({
      logger: this.options.logger,
      elasticsearchClientPromise: this.options.elasticsearchClientPromise,
      spaceId: opts.spaceId,
      kibanaVersion: this.options.kibanaVersion,
      indexPatternsResourceName: this.resourceNames.aliases.prompts,
      currentUser: opts.currentUser,
    });
  }

  public async createAIAssistantAnonymizationFieldsDataClient(
    opts: CreateAIAssistantClientParams
  ): Promise<AIAssistantDataClient | null> {
    const res = await this.checkResourcesInstallation(opts);

    if (res === null) {
      return null;
    }

    return new AIAssistantDataClient({
      logger: this.options.logger,
      elasticsearchClientPromise: this.options.elasticsearchClientPromise,
      spaceId: opts.spaceId,
      kibanaVersion: this.options.kibanaVersion,
      indexPatternsResourceName: this.resourceNames.aliases.anonymizationFields,
      currentUser: opts.currentUser,
    });
  }

  public async getSpaceResourcesInitializationPromise(
    spaceId: string | undefined = DEFAULT_NAMESPACE_STRING
  ): Promise<InitializationPromise> {
    const result = await this.resourceInitializationHelper.getInitializedResources(spaceId);
    // If the spaceId is unrecognized and spaceId is not the default, we
    // need to kick off resource installation and return the promise
    if (
      result.error &&
      result.error.includes(`Unrecognized spaceId`) &&
      spaceId !== DEFAULT_NAMESPACE_STRING
    ) {
      this.resourceInitializationHelper.add(spaceId);
      return this.resourceInitializationHelper.getInitializedResources(spaceId);
    }
    return result;
  }

  private async installAndUpdateSpaceLevelResources(
    spaceId: string | undefined = DEFAULT_NAMESPACE_STRING
  ) {
    try {
      this.options.logger.debug(`Initializing spaceId level resources for AIAssistantService`);
      const conversationsIndexName = await this.conversationsDataStream.getInstalledSpaceName(
        spaceId
      );
      if (!conversationsIndexName) {
        await this.conversationsDataStream.installSpace(spaceId);
      }

      if (this.initializeKnowledgeBase) {
        const knowledgeBaseIndexName = await this.knowledgeBaseDataStream.getInstalledSpaceName(
          spaceId
        );
        if (!knowledgeBaseIndexName) {
          await this.knowledgeBaseDataStream.installSpace(spaceId);
        }
      }

      const promptsIndexName = await this.promptsDataStream.getInstalledSpaceName(spaceId);
      if (!promptsIndexName) {
        await this.promptsDataStream.installSpace(spaceId);
      }

      const anonymizationFieldsIndexName =
        await this.anonymizationFieldsDataStream.getInstalledSpaceName(spaceId);

      if (!anonymizationFieldsIndexName) {
        await this.anonymizationFieldsDataStream.installSpace(spaceId);
        await this.createDefaultAnonymizationFields(spaceId);
      }
    } catch (error) {
      this.options.logger.error(
        `Error initializing AI assistant namespace level resources: ${error.message}`
      );
      throw error;
    }
  }

  private async createDefaultAnonymizationFields(spaceId: string) {
    const dataClient = new AIAssistantDataClient({
      logger: this.options.logger,
      elasticsearchClientPromise: this.options.elasticsearchClientPromise,
      spaceId,
      kibanaVersion: this.options.kibanaVersion,
      indexPatternsResourceName: this.resourceNames.aliases.anonymizationFields,
      currentUser: null,
    });

    const existingAnonymizationFields = await (
      await dataClient?.getReader()
    ).search({
      body: {
        size: 1,
      },
      allow_no_indices: true,
    });
    if (existingAnonymizationFields.hits.total.value === 0) {
      const writer = await dataClient?.getWriter();
      const res = await writer?.bulk({
        documentsToCreate: getDefaultAnonymizationFields(spaceId),
      });
      this.options.logger.info(`Created default anonymization fields: ${res?.docs_created.length}`);
    }
  }
}
