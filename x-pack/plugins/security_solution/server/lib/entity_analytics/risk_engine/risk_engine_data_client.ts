/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { AuditLogger } from '@kbn/security-plugin-types-server';
import { RiskEngineStatusEnum } from '../../../../common/api/entity_analytics';
import type { InitRiskEngineResult } from '../../../../common/entity_analytics/risk_engine';
import { MAX_SPACES_COUNT, RiskScoreEntity } from '../../../../common/entity_analytics/risk_engine';
import { removeLegacyTransforms, getLegacyTransforms } from '../utils/transforms';
import {
  updateSavedObjectAttribute,
  getConfiguration,
  initSavedObjects,
  getEnabledRiskEngineAmount,
  deleteSavedObjects,
} from './utils/saved_object_configuration';
import { bulkDeleteSavedObjects } from '../../risk_score/prebuilt_saved_objects/helpers/bulk_delete_saved_objects';
import type { RiskScoreDataClient } from '../risk_score/risk_score_data_client';
import { removeRiskScoringTask, startRiskScoringTask } from '../risk_score/tasks';
import { RiskEngineAuditActions } from './audit';
import { AUDIT_CATEGORY, AUDIT_OUTCOME, AUDIT_TYPE } from '../audit';
import { getRiskScoringTaskStatus, scheduleNow } from '../risk_score/tasks/risk_scoring_task';

interface InitOpts {
  namespace: string;
  taskManager: TaskManagerStartContract;
  riskScoreDataClient: RiskScoreDataClient;
}

interface TearDownParams {
  taskManager: TaskManagerStartContract;
  riskScoreDataClient: RiskScoreDataClient;
}

interface RiskEngineDataClientOpts {
  logger: Logger;
  kibanaVersion: string;
  esClient: ElasticsearchClient;
  namespace: string;
  soClient: SavedObjectsClientContract;
  auditLogger: AuditLogger | undefined;
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
      this.options.auditLogger?.log({
        message: 'System disabled the legacy risk engine.',
        event: {
          action: RiskEngineAuditActions.RISK_ENGINE_DISABLE_LEGACY_ENGINE,
          category: AUDIT_CATEGORY.DATABASE,
          type: AUDIT_TYPE.CHANGE,
          outcome: AUDIT_OUTCOME.SUCCESS,
        },
      });
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

  public async getStatus({
    namespace,
    taskManager,
  }: {
    namespace: string;
    taskManager?: TaskManagerStartContract;
  }) {
    const riskEngineStatus = await this.getCurrentStatus();
    const legacyRiskEngineStatus = await this.getLegacyStatus({ namespace });
    const isMaxAmountOfRiskEnginesReached = await this.getIsMaxAmountOfRiskEnginesReached();

    const taskStatus =
      riskEngineStatus === 'ENABLED' && taskManager
        ? await getRiskScoringTaskStatus({ namespace, taskManager })
        : undefined;

    this.options.auditLogger?.log({
      message: 'User checked if the risk engine is enabled',
      event: {
        action: RiskEngineAuditActions.RISK_ENGINE_STATUS_GET,
        category: AUDIT_CATEGORY.DATABASE,
        type: AUDIT_TYPE.ACCESS,
        outcome: AUDIT_OUTCOME.SUCCESS,
      },
    });

    return {
      riskEngineStatus,
      legacyRiskEngineStatus,
      isMaxAmountOfRiskEnginesReached,
      taskStatus,
    };
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

      this.options.auditLogger?.log({
        message: 'User started risk scoring service',
        event: {
          action: RiskEngineAuditActions.RISK_ENGINE_START,
          category: AUDIT_CATEGORY.DATABASE,
          type: AUDIT_TYPE.CHANGE,
          outcome: AUDIT_OUTCOME.SUCCESS,
        },
      });

      return configurationResult;
    } catch (e) {
      this.options.logger.error(`Error while enabling risk engine: ${e.message}`);

      this.options.auditLogger?.log({
        message: 'System stopped risk scoring service after error occurred',
        event: {
          action: RiskEngineAuditActions.RISK_ENGINE_DISABLE,
          category: AUDIT_CATEGORY.DATABASE,
          type: AUDIT_TYPE.CHANGE,
          outcome: AUDIT_OUTCOME.FAILURE,
        },
        error: e,
      });

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

    this.options.auditLogger?.log({
      message: 'User removed risk scoring task',
      event: {
        action: RiskEngineAuditActions.RISK_ENGINE_REMOVE_TASK,
        category: AUDIT_CATEGORY.DATABASE,
        type: AUDIT_TYPE.CHANGE,
        outcome: AUDIT_OUTCOME.SUCCESS,
      },
    });

    return updateSavedObjectAttribute({
      savedObjectsClient: this.options.soClient,
      attributes: {
        enabled: false,
      },
    });
  }

  public async scheduleNow({ taskManager }: { taskManager: TaskManagerStartContract }) {
    const riskEngineStatus = await this.getCurrentStatus();

    if (riskEngineStatus !== 'ENABLED') {
      throw new Error(
        `The risk engine must be enable to schedule a run. Current status: ${riskEngineStatus}`
      );
    }

    this.options.auditLogger?.log({
      message: 'User scheduled a risk engine run',
      event: {
        action: RiskEngineAuditActions.RISK_ENGINE_SCHEDULE_NOW,
        category: AUDIT_CATEGORY.DATABASE,
        type: AUDIT_TYPE.ACCESS,
        outcome: AUDIT_OUTCOME.SUCCESS,
      },
    });

    return scheduleNow({
      taskManager,
      namespace: this.options.namespace,
      logger: this.options.logger,
    });
  }

  /**
   * Delete all risk engine resources.
   *
   * It returns an array of errors that occurred during the deletion.
   *
   * WARNING: It will remove all data.
   */
  public async tearDown({ taskManager, riskScoreDataClient }: TearDownParams) {
    const errors: Error[] = [];
    const addError = (e: Error) => errors.push(e);

    await removeRiskScoringTask({
      namespace: this.options.namespace,
      taskManager,
      logger: this.options.logger,
    }).catch(addError);

    await deleteSavedObjects({ savedObjectsClient: this.options.soClient }).catch(addError);
    const riskScoreErrors = await riskScoreDataClient.tearDown();
    errors.concat(riskScoreErrors);

    return errors;
  }

  public async disableLegacyRiskEngine({ namespace }: { namespace: string }) {
    const legacyRiskEngineStatus = await this.getLegacyStatus({ namespace });

    if (legacyRiskEngineStatus === RiskEngineStatusEnum.NOT_INSTALLED) {
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

    return newlegacyRiskEngineStatus === RiskEngineStatusEnum.NOT_INSTALLED;
  }

  private async getCurrentStatus() {
    const configuration = await this.getConfiguration();

    if (configuration) {
      return configuration.enabled ? RiskEngineStatusEnum.ENABLED : RiskEngineStatusEnum.DISABLED;
    }

    return RiskEngineStatusEnum.NOT_INSTALLED;
  }

  private async getIsMaxAmountOfRiskEnginesReached() {
    try {
      const amountOfEnabledConfigurations = await getEnabledRiskEngineAmount({
        savedObjectsClient: this.options.soClient,
      });

      this.options.auditLogger?.log({
        message: 'System checked if the risk engine is enabled in each space',
        event: {
          action: RiskEngineAuditActions.RISK_ENGINE_STATUS_FOR_ALL_SPACES_GET,
          category: AUDIT_CATEGORY.DATABASE,
          type: AUDIT_TYPE.ACCESS,
          outcome: AUDIT_OUTCOME.SUCCESS,
        },
      });

      return amountOfEnabledConfigurations >= MAX_SPACES_COUNT;
    } catch (e) {
      this.options.logger.error(`Error while getting amount of enabled risk engines: ${e.message}`);
      return false;
    }
  }

  private async getLegacyStatus({ namespace }: { namespace: string }) {
    const transforms = await getLegacyTransforms({ namespace, esClient: this.options.esClient });

    this.options.auditLogger?.log({
      message: 'System checked if the legacy risk engine is enabled',
      event: {
        action: RiskEngineAuditActions.RISK_ENGINE_GET_LEGACY_ENGINE_STATUS_GET,
        category: AUDIT_CATEGORY.DATABASE,
        type: AUDIT_TYPE.ACCESS,
        outcome: AUDIT_OUTCOME.SUCCESS,
      },
    });

    if (transforms.length === 0) {
      return RiskEngineStatusEnum.NOT_INSTALLED;
    }

    return RiskEngineStatusEnum.ENABLED;
  }
}
