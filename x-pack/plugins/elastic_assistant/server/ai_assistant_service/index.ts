/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataStreamSpacesAdapter } from '@kbn/data-stream-adapter';
import { DEFAULT_NAMESPACE_STRING } from '@kbn/core-saved-objects-utils-server';
import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import type { TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';
import { AuthenticatedUser } from '@kbn/security-plugin/server';
import { Subject } from 'rxjs';
import { AssistantResourceNames } from '../types';
import { AIAssistantConversationsDataClient } from '../conversations_data_client';
import {
  InitializationPromise,
  ResourceInstallationHelper,
  createResourceInstallationHelper,
  errorResult,
  successResult,
} from './create_resource_installation_helper';
import { conversationsFieldMap } from './conversation_configuration_type';

const TOTAL_FIELDS_LIMIT = 2500;

function getResourceName(resource: string) {
  return `.kibana-elastic-ai-assistant-${resource}`;
}

interface AIAssistantServiceOpts {
  logger: Logger;
  kibanaVersion: string;
  elasticsearchClientPromise: Promise<ElasticsearchClient>;
  taskManager: TaskManagerSetupContract;
  pluginStop$: Subject<void>;
}

export interface CreateAIAssistantClientParams {
  logger: Logger;
  spaceId: string;
  currentUser: AuthenticatedUser | null;
}

export type CreateConversationsDataStream = (params: {
  kibanaVersion: string;
  spaceId?: string;
}) => DataStreamSpacesAdapter;

export class AIAssistantService {
  private initialized: boolean;
  private isInitializing: boolean = false;
  private conversationsDataStream: DataStreamSpacesAdapter;
  private resourceInitializationHelper: ResourceInstallationHelper;
  private initPromise: Promise<InitializationPromise>;

  constructor(private readonly options: AIAssistantServiceOpts) {
    this.initialized = false;
    this.conversationsDataStream = this.createConversationsDataStream({
      kibanaVersion: options.kibanaVersion,
    });

    this.initPromise = this.initializeResources();

    this.resourceInitializationHelper = createResourceInstallationHelper(
      this.options.logger,
      this.initPromise,
      this.installAndUpdateSpaceLevelResources.bind(this)
    );
  }

  public async isInitialized() {
    return this.initialized;
  }

  private createConversationsDataStream: CreateConversationsDataStream = ({ kibanaVersion }) => {
    const conversationsDataStream = new DataStreamSpacesAdapter(
      this.resourceNames.aliases.conversations,
      {
        kibanaVersion,
        totalFieldsLimit: TOTAL_FIELDS_LIMIT,
      }
    );

    conversationsDataStream.setComponentTemplate({
      name: this.resourceNames.componentTemplate.conversations,
      fieldMap: conversationsFieldMap,
    });

    conversationsDataStream.setIndexTemplate({
      name: this.resourceNames.indexTemplate.conversations,
      componentTemplateRefs: [this.resourceNames.componentTemplate.conversations],
    });

    return conversationsDataStream;
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
  ): Promise<AIAssistantConversationsDataClient | null> {
    // Check if resources installation has succeeded
    const { result: initialized, error } = await this.getSpaceResourcesInitializationPromise(
      opts.spaceId
    );

    // If space evel resources initialization failed, retry
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

    return new AIAssistantConversationsDataClient({
      logger: this.options.logger,
      elasticsearchClientPromise: this.options.elasticsearchClientPromise,
      spaceId: opts.spaceId,
      kibanaVersion: this.options.kibanaVersion,
      indexPatternsResorceName: this.resourceNames.aliases.conversations,
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
      let indexName = await this.conversationsDataStream.getInstalledSpaceName(spaceId);
      if (!indexName) {
        indexName = await this.conversationsDataStream.installSpace(spaceId);
      }
    } catch (error) {
      this.options.logger.error(
        `Error initializing AI assistant namespace level resources: ${error.message}`
      );
      throw error;
    }
  }
}
