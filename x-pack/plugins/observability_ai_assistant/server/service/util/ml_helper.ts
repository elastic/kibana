/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { gatewayTimeout } from '@hapi/boom';
import type {
  CoreSetup,
  KibanaRequest,
  Logger,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import type { MlPluginSetup } from '@kbn/ml-plugin/server';
import pRetry from 'p-retry';
import { ObservabilityAIAssistantPluginStartDependencies } from '../../types';

const ELSER_MODEL_ID_FALLBACK = '.elser_model_2';

function isAlreadyExistsError(error: Error) {
  return (
    error instanceof errors.ResponseError &&
    (error.body.error.type === 'resource_not_found_exception' ||
      error.body.error.type === 'status_exception')
  );
}

export class MlHelper {
  private elserModelId?: string;

  constructor(
    private readonly core: CoreSetup<ObservabilityAIAssistantPluginStartDependencies>,
    private readonly ml: MlPluginSetup,
    private readonly logger: Logger
  ) {}

  public async recommendedElserModelId() {
    // We store the model ID to ensure the same model ID is used during init, model installation and recall
    if (this.elserModelId) {
      return this.elserModelId;
    }

    try {
      // Wait for the ML plugin's dependency on the internal saved objects client to be ready
      const [_, pluginsStart] = await this.core.getStartServices();

      // Wait for the license to be available so the ML plugin's guards pass once we ask for ELSER stats
      await pluginsStart.licensing.refresh();

      const elserModelDefinition = await this.ml
        .trainedModelsProvider({} as any, {} as any) // This call doesn't use saved objects so faking should be fine
        .getELSER();
      this.elserModelId = elserModelDefinition.model_id;
    } catch (error) {
      this.logger.error(`Failed to resolve recommended ELSER model:\n${error}`);
      this.elserModelId = ELSER_MODEL_ID_FALLBACK;
    }

    return this.elserModelId;
  }

  public async setupElser(request: KibanaRequest, savedObjectsClient: SavedObjectsClientContract) {
    const elserModelId = await this.recommendedElserModelId();
    const trainedModelsProvider = this.ml.trainedModelsProvider(request, savedObjectsClient);

    const retryOptions = { factor: 1, minTimeout: 10000, retries: 12 };

    const installModel = async () => {
      this.logger.info('Installing ELSER model');
      await trainedModelsProvider.installElasticModel(elserModelId);
      this.logger.info('Finished installing ELSER model');
    };

    const getIsModelInstalled = async () => {
      const getResponse = await trainedModelsProvider.getTrainedModels({
        model_id: elserModelId,
        include: 'definition_status',
      });

      this.logger.debug(
        'Model definition status:\n' + JSON.stringify(getResponse.trained_model_configs[0])
      );

      return Boolean(getResponse.trained_model_configs[0]?.fully_defined);
    };

    await pRetry(async () => {
      let isModelInstalled: boolean = false;
      try {
        isModelInstalled = await getIsModelInstalled();
      } catch (error) {
        if (error.statusCode === 404) {
          await installModel();
          isModelInstalled = await getIsModelInstalled();
        }
      }

      if (!isModelInstalled) {
        throw new Error('Model is not fully defined');
      }
    }, retryOptions);

    try {
      await trainedModelsProvider.startTrainedModelDeployment({
        model_id: elserModelId,
        wait_for: 'fully_allocated',
      });
    } catch (error) {
      this.logger.debug('Error starting model deployment');
      this.logger.debug(error);
      if (!isAlreadyExistsError(error)) {
        throw error;
      }
    }

    await pRetry(async () => {
      const response = await trainedModelsProvider.getTrainedModelsStats({
        model_id: elserModelId,
      });

      if (
        response.trained_model_stats[0]?.deployment_stats?.allocation_status.state ===
        'fully_allocated'
      ) {
        return Promise.resolve();
      }

      this.logger.debug('Model is not allocated yet');
      this.logger.debug(JSON.stringify(response));

      throw gatewayTimeout();
    }, retryOptions);

    this.logger.info('Model is ready');
  }

  public async elserStatus(request: KibanaRequest, savedObjectsClient: SavedObjectsClientContract) {
    const elserModelId = await this.recommendedElserModelId();

    try {
      const modelStats = await this.ml
        .trainedModelsProvider(request, savedObjectsClient)
        .getTrainedModelsStats({
          model_id: elserModelId,
        });
      const elserModelStats = modelStats.trained_model_stats[0];
      const deploymentState = elserModelStats.deployment_stats?.state;
      const allocationState = elserModelStats.deployment_stats?.allocation_status.state;

      return {
        ready: deploymentState === 'started' && allocationState === 'fully_allocated',
        modelName: elserModelId,
        deploymentState,
        allocationState,
      };
    } catch (error) {
      if (error.statusCode === 404) {
        return {
          ready: false,
          modelName: elserModelId,
        };
      }

      return {
        error: error instanceof errors.ResponseError ? error.body.error : String(error),
        ready: false,
        modelName: elserModelId,
      };
    }
  }
}
