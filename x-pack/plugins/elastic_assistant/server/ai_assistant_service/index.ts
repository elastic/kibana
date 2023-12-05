/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Metadata } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { ClusterPutComponentTemplateRequest } from '@elastic/elasticsearch/lib/api/types';
import {
  createOrUpdateComponentTemplate,
  createOrUpdateIndexTemplate,
} from '@kbn/alerting-plugin/server';
import { DEFAULT_NAMESPACE_STRING } from '@kbn/core-saved-objects-utils-server';
import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import type { TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';
import { ecsFieldMap } from '@kbn/alerts-as-data-utils';
import { AssistantResourceNames } from '../types';
import {
  conversationsFieldMap,
  getIndexTemplateAndPattern,
  mappingComponentName,
  totalFieldsLimit,
} from './lib/conversation_configuration_type';
import { createConcreteWriteIndex } from './lib/create_concrete_write_index';
import { DataStreamAdapter } from './lib/create_datastream';
import { AIAssistantDataClient } from '../ai_assistant_data_client';
import {
  InitializationPromise,
  ResourceInstallationHelper,
  createResourceInstallationHelper,
  errorResult,
  successResult,
} from './create_resource_installation_helper';
import { getComponentTemplateFromFieldMap } from './field_maps/component_template_from_field_map';
import { mappingFromFieldMap } from './field_maps/mapping_from_field_map';

export const ECS_CONTEXT = `ecs`;
function getResourceName(resource: string) {
  return `.kibana-elastic-ai-assistant-${resource}`;
}

export const getComponentTemplateName = (name: string) => `.alerts-${name}-mappings`;

interface AIAssistantServiceOpts {
  logger: Logger;
  kibanaVersion: string;
  elasticsearchClientPromise: Promise<ElasticsearchClient>;
  dataStreamAdapter: DataStreamAdapter;
  taskManager: TaskManagerSetupContract;
}

export interface CreateAIAssistantClientParams {
  logger: Logger;
  namespace: string;
}

export class AIAssistantService {
  private dataStreamAdapter: DataStreamAdapter;
  private initialized: boolean;
  private isInitializing: boolean = false;
  private registeredNamespaces: Set<string> = new Set();
  private resourceInitializationHelper: ResourceInstallationHelper;
  private commonInitPromise: Promise<InitializationPromise>;

  constructor(private readonly options: AIAssistantServiceOpts) {
    this.initialized = false;
    this.dataStreamAdapter = options.dataStreamAdapter;

    this.commonInitPromise = this.initializeResources();

    // Create helper for initializing context-specific resources
    this.resourceInitializationHelper = createResourceInstallationHelper(
      this.options.logger,
      this.commonInitPromise,
      this.installAndUpdateNamespaceLevelResources.bind(this)
    );
  }

  public async isInitialized() {
    return this.initialized;
  }

  private readonly resourceNames: AssistantResourceNames = {
    componentTemplate: {
      conversations: getResourceName('component-template-conversations'),
      kb: getResourceName('component-template-kb'),
    },
    aliases: {
      conversations: getResourceName('conversations'),
      kb: getResourceName('kb'),
    },
    indexPatterns: {
      conversations: getResourceName('conversations*'),
      kb: getResourceName('kb*'),
    },
    indexTemplate: {
      conversations: getResourceName('index-template-conversations'),
      kb: getResourceName('index-template-kb'),
    },
    pipelines: {
      kb: getResourceName('kb-ingest-pipeline'),
    },
  };

  public async createAIAssistantDatastreamClient(
    opts: CreateAIAssistantClientParams
  ): Promise<AIAssistantDataClient | null> {
    // Check if context specific installation has succeeded
    const { result: initialized, error } = await this.getResourcesInitializationPromise(
      opts.namespace
    );

    // If initialization failed, retry
    if (!initialized && error) {
      let initPromise: Promise<InitializationPromise> | undefined;

      // If !this.initialized, we know that resource initialization failed
      // and we need to retry this before retrying the namespace specific resources
      if (!this.initialized) {
        if (!this.isInitializing) {
          this.options.logger.info(`Retrying common resource initialization`);
          initPromise = this.initializeResources();
        } else {
          this.options.logger.info(
            `Skipped retrying common resource initialization because it is already being retried.`
          );
        }
      }

      this.resourceInitializationHelper.retry(opts.namespace, initPromise);

      const retryResult = await this.resourceInitializationHelper.getInitializedResources(
        opts.namespace ?? DEFAULT_NAMESPACE_STRING
      );

      if (!retryResult.result) {
        const errorLogPrefix = `There was an error in the framework installing namespace-level resources and creating concrete indices for namespace "${opts.namespace}" - `;
        // Retry also failed
        this.options.logger.warn(
          retryResult.error && error
            ? `${errorLogPrefix}Retry failed with errors: ${error}`
            : `${errorLogPrefix}Original error: ${error}; Error after retry: ${retryResult.error}`
        );
        return null;
      } else {
        this.options.logger.info(
          `Resource installation for "${opts.namespace}" succeeded after retry`
        );
      }
    }

    return new AIAssistantDataClient({
      logger: this.options.logger,
      elasticsearchClientPromise: this.options.elasticsearchClientPromise,
      namespace: opts.namespace,
      kibanaVersion: this.options.kibanaVersion,
      indexPatternsResorceName: this.resourceNames.indexPatterns.conversations,
    });
  }

  public async getResourcesInitializationPromise(
    namespace?: string
  ): Promise<InitializationPromise> {
    const registeredOpts = namespace && this.registeredNamespaces.has(namespace) ? namespace : null;

    if (!registeredOpts) {
      const errMsg = `Error getting initialized status for namespace ${namespace} - namespace has not been registered.`;
      this.options.logger.error(errMsg);
      return errorResult(errMsg);
    }

    const result = await this.resourceInitializationHelper.getInitializedResources(
      namespace ?? DEFAULT_NAMESPACE_STRING
    );

    // If the context is unrecognized and namespace is not the default, we
    // need to kick off resource installation and return the promise
    if (
      result.error &&
      result.error.includes(`Unrecognized context`) &&
      namespace !== DEFAULT_NAMESPACE_STRING
    ) {
      this.resourceInitializationHelper.add(namespace);

      return this.resourceInitializationHelper.getInitializedResources(namespace ?? 'default');
    }

    return result;
  }

  private async initializeResources(): Promise<InitializationPromise> {
    try {
      this.options.logger.debug(`Initializing resources for AIAssistantService`);
      const esClient = await this.options.elasticsearchClientPromise;

      // TODO: add DLM policy
      await Promise.all([
        createOrUpdateComponentTemplate({
          logger: this.options.logger,
          esClient,
          template: getComponentTemplateFromFieldMap({
            name: `${this.resourceNames.componentTemplate.conversations}-ecs`,
            fieldMap: ecsFieldMap,
            dynamic: false,
            includeSettings: true,
          }),
          totalFieldsLimit,
        }),
        createOrUpdateComponentTemplate({
          logger: this.options.logger,
          esClient,
          template: {
            name: this.resourceNames.componentTemplate.conversations,
            _meta: {
              managed: true,
            },
            template: {
              settings: {},
              mappings: mappingFromFieldMap(conversationsFieldMap, 'strict'),
            },
          } as ClusterPutComponentTemplateRequest,
          totalFieldsLimit,
        }),
      ]);

      this.initialized = true;
      this.isInitializing = false;
      return successResult();
    } catch (error) {
      this.options.logger.error(`Error initializing AI assistant resources: ${error.message}`);
      this.initialized = false;
      this.isInitializing = false;
      return errorResult(error.message);
    }
  }

  private async installAndUpdateNamespaceLevelResources(namespace?: string) {
    try {
      this.options.logger.debug(`Initializing namespace level resources for AIAssistantService`);
      const esClient = await this.options.elasticsearchClientPromise;

      const indexMetadata: Metadata = {
        kibana: {
          version: this.options.kibanaVersion,
        },
        managed: true,
        namespace,
      };

      const indexPatterns = getIndexTemplateAndPattern(
        this.resourceNames.indexPatterns.conversations,
        namespace ?? 'default'
      );

      await createOrUpdateIndexTemplate({
        logger: this.options.logger,
        esClient,
        template: {
          name: indexPatterns.template,
          body: {
            data_stream: { hidden: true },
            index_patterns: [indexPatterns.alias],
            composed_of: [mappingComponentName],
            template: {
              lifecycle: {},
              settings: {
                'index.mapping.total_fields.limit': totalFieldsLimit,
              },
              mappings: {
                dynamic: false,
                _meta: indexMetadata,
              },
            },
            _meta: indexMetadata,
          },
        },
      });

      await createConcreteWriteIndex({
        logger: this.options.logger,
        esClient,
        totalFieldsLimit,
        indexPatterns,
        dataStreamAdapter: this.dataStreamAdapter,
      });
    } catch (error) {
      this.options.logger.error(
        `Error initializing AI assistant namespace level resources: ${error.message}`
      );
      throw error;
    }
  }
}
