/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { InitRiskEngineResult } from '../../../../common/entity_analytics/risk_engine';
import {
  RiskEngineStatus,
  MAX_SPACES_COUNT,
  RiskScoreEntity,
} from '../../../../common/entity_analytics/risk_engine';
import { removeLegacyTransforms, getLegacyTransforms } from '../utils/transforms';
import {
  updateSavedObjectAttribute,
  getConfiguration,
  initSavedObjects,
  getEnabledRiskEngineAmount,
} from './utils/saved_object_configuration';
import { bulkDeleteSavedObjects } from '../../risk_score/prebuilt_saved_objects/helpers/bulk_delete_saved_objects';
import type { RiskScoreDataClient } from '../risk_score/risk_score_data_client';
import { removeRiskScoringTask, startRiskScoringTask } from '../risk_score/tasks';

interface InitOpts {
  namespace: string;
  taskManager: TaskManagerStartContract;
  riskScoreDataClient: RiskScoreDataClient;
}

interface RiskEngineDataClientOpts {
  logger: Logger;
  kibanaVersion: string;
  esClient: ElasticsearchClient;
  namespace: string;
  soClient: SavedObjectsClientContract;
}

export class RiskEngineDataClient {
  constructor(private readonly options: RiskEngineDataClientOpts) {}

  public async init({ namespace, taskManager, riskScoreDataClient }: InitOpts) {
    const result: InitRiskEngineResult = {
      legacyRiskEngineDisabled: false,
      riskEngineResourcesInstalled: false,
      riskEngineConfigurationCreated: false,
      riskEngineEnabled: false,
      errors: [] as string[],
    };

    try {
      result.legacyRiskEngineDisabled = await this.disableLegacyRiskEngine({ namespace });
    } catch (e) {
      result.legacyRiskEngineDisabled = false;
      result.errors.push(e.message);
    }

    try {
      await riskScoreDataClient.init();
      result.riskEngineResourcesInstalled = true;
    } catch (e) {
      result.errors.push(e.message);
      return result;
    }

    try {
      await initSavedObjects({
        savedObjectsClient: this.options.soClient,
        namespace,
      });
      result.riskEngineConfigurationCreated = true;
    } catch (e) {
      result.errors.push(e.message);
      return result;
    }

    // should be the last step, after all resources are installed
    try {
      await this.enableRiskEngine({ taskManager });
      result.riskEngineEnabled = true;
    } catch (e) {
      result.errors.push(e.message);
      return result;
    }

    return result;
  }

  public getConfiguration = () =>
    getConfiguration({
      savedObjectsClient: this.options.soClient,
    });

  public async getStatus({ namespace }: { namespace: string }) {
    const riskEngineStatus = await this.getCurrentStatus();
    const legacyRiskEngineStatus = await this.getLegacyStatus({ namespace });
    const isMaxAmountOfRiskEnginesReached = await this.getIsMaxAmountOfRiskEnginesReached();
    return { riskEngineStatus, legacyRiskEngineStatus, isMaxAmountOfRiskEnginesReached };
  }

  public async enableRiskEngine({ taskManager }: { taskManager: TaskManagerStartContract }) {
    try {
      const configurationResult = await updateSavedObjectAttribute({
        savedObjectsClient: this.options.soClient,
        attributes: {
          enabled: true,
        },
      });

      await startRiskScoringTask({
        logger: this.options.logger,
        namespace: this.options.namespace,
        riskEngineDataClient: this,
        taskManager,
      });

      return configurationResult;
    } catch (e) {
      this.options.logger.error(`Error while enabling risk engine: ${e.message}`);

      await this.disableRiskEngine({ taskManager });

      throw e;
    }
  }

  public async disableRiskEngine({ taskManager }: { taskManager: TaskManagerStartContract }) {
    await removeRiskScoringTask({
      namespace: this.options.namespace,
      taskManager,
      logger: this.options.logger,
    });

    return updateSavedObjectAttribute({
      savedObjectsClient: this.options.soClient,
      attributes: {
        enabled: false,
      },
    });
  }

  public async disableLegacyRiskEngine({ namespace }: { namespace: string }) {
    const legacyRiskEngineStatus = await this.getLegacyStatus({ namespace });

    if (legacyRiskEngineStatus === RiskEngineStatus.NOT_INSTALLED) {
      return true;
    }

    await removeLegacyTransforms({
      esClient: this.options.esClient,
      namespace,
    });

    const deleteDashboardsPromises = [RiskScoreEntity.host, RiskScoreEntity.user].map((entity) =>
      bulkDeleteSavedObjects({
        deleteAll: true,
        savedObjectsClient: this.options.soClient,
        spaceId: namespace,
        savedObjectTemplate: `${entity}RiskScoreDashboards`,
      })
    );

    await Promise.all(deleteDashboardsPromises);

    const newlegacyRiskEngineStatus = await this.getLegacyStatus({ namespace });

    return newlegacyRiskEngineStatus === RiskEngineStatus.NOT_INSTALLED;
  }

  private async getCurrentStatus() {
    const configuration = await this.getConfiguration();

    if (configuration) {
      return configuration.enabled ? RiskEngineStatus.ENABLED : RiskEngineStatus.DISABLED;
    }

    return RiskEngineStatus.NOT_INSTALLED;
  }

  private async getIsMaxAmountOfRiskEnginesReached() {
    try {
      const amountOfEnabledConfigurations = await getEnabledRiskEngineAmount({
        savedObjectsClient: this.options.soClient,
      });

      return amountOfEnabledConfigurations >= MAX_SPACES_COUNT;
    } catch (e) {
      this.options.logger.error(`Error while getting amount of enabled risk engines: ${e.message}`);
      return false;
    }
  }

  private async getLegacyStatus({ namespace }: { namespace: string }) {
    const transforms = await getLegacyTransforms({ namespace, esClient: this.options.esClient });

    if (transforms.length === 0) {
      return RiskEngineStatus.NOT_INSTALLED;
    }

    return RiskEngineStatus.ENABLED;
  }
}
