/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { RiskScoreEntity } from '../../../../../common/search_strategy';
import {
  getCreateLatestTransformOptions,
  getCreateMLHostPivotTransformOptions,
  getCreateMLUserPivotTransformOptions,
  getCreateRiskScoreIndicesOptions,
  getCreateRiskScoreLatestIndicesOptions,
  getRiskHostCreateInitScriptOptions,
  getRiskHostCreateLevelScriptOptions,
  getRiskHostCreateMapScriptOptions,
  getRiskHostCreateReduceScriptOptions,
  getRiskScoreIngestPipelineOptions,
  getRiskScoreLatestTransformId,
  getRiskScorePivotTransformId,
  getRiskUserCreateLevelScriptOptions,
  getRiskUserCreateMapScriptOptions,
  getRiskUserCreateReduceScriptOptions,
} from '../../../../../common/utils/risk_score_modules';
import { createIndex } from '../../indices/lib/create_index';
import { createStoredScript } from '../../stored_scripts/lib/create_script';
import { createAndStartTransform } from '../../transform/helpers/transforms';
import { createIngestPipeline } from './ingest_pipeline';

interface InstallRiskScoreModule {
  esClient: ElasticsearchClient;
  logger: Logger;
  riskScoreEntity: RiskScoreEntity;
  spaceId: string;
}

const createHostRiskScoreIngestPipelineGrouping = ({
  esClient,
  logger,
  riskScoreEntity,
  spaceId,
}: InstallRiskScoreModule) => {
  /**
   * console_templates/enable_host_risk_score.console
   * Step 1 Upload script: ml_hostriskscore_levels_script_{spaceId}
   */
  const createLevelScriptOptions = getRiskHostCreateLevelScriptOptions(spaceId);

  return createStoredScript({
    esClient,
    logger,
    options: createLevelScriptOptions,
  }).then((createStoredScriptResult) => {
    if (createStoredScriptResult[createLevelScriptOptions.id].success) {
      /**
       * console_templates/enable_host_risk_score.console
       * Step 5 Upload the ingest pipeline: ml_hostriskscore_ingest_pipeline_{spaceId}
       */
      const createIngestPipelineOptions = getRiskScoreIngestPipelineOptions(
        riskScoreEntity,
        spaceId
      );
      return createIngestPipeline({
        esClient,
        logger,
        options: createIngestPipelineOptions,
      }).then((createIngestPipelineResult) => {
        return [createStoredScriptResult, createIngestPipelineResult];
      });
    } else {
      return [createStoredScriptResult];
    }
  });
};

const installHostRiskScoreModule = async ({
  esClient,
  riskScoreEntity,
  logger,
  spaceId,
}: InstallRiskScoreModule) => {
  const result = await Promise.all([
    /**
     * console_templates/enable_host_risk_score.console
     * Step 1 Upload script: ml_hostriskscore_levels_script_{spaceId}
     * Step 5 Upload the ingest pipeline: ml_hostriskscore_ingest_pipeline_{spaceId}
     */
    createHostRiskScoreIngestPipelineGrouping({
      esClient,
      logger,
      riskScoreEntity,
      spaceId,
    }),
    /**
     * console_templates/enable_host_risk_score.console
     * Step 2 Upload script: ml_hostriskscore_init_script_{spaceId}
     */
    createStoredScript({
      esClient,
      logger,
      options: getRiskHostCreateInitScriptOptions(spaceId),
    }),

    /**
     * console_templates/enable_host_risk_score.console
     * Step 3 Upload script: ml_hostriskscore_map_script_{spaceId}
     */
    createStoredScript({
      esClient,
      logger,
      options: getRiskHostCreateMapScriptOptions(spaceId),
    }),

    /**
     * console_templates/enable_host_risk_score.console
     * Step 4 Upload script: ml_hostriskscore_reduce_script_{spaceId}
     */
    createStoredScript({
      esClient,
      logger,
      options: getRiskHostCreateReduceScriptOptions(spaceId),
    }),

    /**
     * console_templates/enable_host_risk_score.console
     * Step 6 create ml_host_risk_score_{spaceId} index
     */
    createIndex({
      esClient,
      logger,
      options: getCreateRiskScoreIndicesOptions({
        spaceId,
        riskScoreEntity,
      }),
    }),

    /**
     * console_templates/enable_host_risk_score.console
     * Step 9 create ml_host_risk_score_latest_{spaceId} index
     */
    createIndex({
      esClient,
      logger,
      options: getCreateRiskScoreLatestIndicesOptions({
        spaceId,
        riskScoreEntity,
      }),
    }),
  ]);

  /**
   * console_templates/enable_host_risk_score.console
   * Step 7 create transform: ml_hostriskscore_pivot_transform_{spaceId}
   * Step 8 Start the pivot transform
   */
  const createAndStartPivotTransformResult = await createAndStartTransform({
    esClient,
    logger,
    transformId: getRiskScorePivotTransformId(riskScoreEntity, spaceId),
    options: getCreateMLHostPivotTransformOptions({ spaceId }),
  });

  /**
   * console_templates/enable_host_risk_score.console
   * Step 10 create transform: ml_hostriskscore_latest_transform_{spaceId}
   * Step 11 Start the latest transform
   */
  const createAndStartLatestTransformResult = await createAndStartTransform({
    esClient,
    logger,
    transformId: getRiskScoreLatestTransformId(riskScoreEntity, spaceId),
    options: getCreateLatestTransformOptions({ riskScoreEntity, spaceId }),
  });

  return [
    ...result,
    createAndStartPivotTransformResult,
    createAndStartLatestTransformResult,
  ].flat();
};

const createUserRiskScoreIngestPipelineGrouping = async ({
  esClient,
  logger,
  riskScoreEntity,
  spaceId,
}: InstallRiskScoreModule) => {
  /**
   * console_templates/enable_user_risk_score.console
   * Step 1 Upload script: ml_userriskscore_levels_script_{spaceId}
   */
  const createLevelScriptOptions = getRiskUserCreateLevelScriptOptions(spaceId);

  const createStoredScriptResult = await createStoredScript({
    esClient,
    logger,
    options: createLevelScriptOptions,
  });

  /**
   * console_templates/enable_user_risk_score.console
   * Step 4 Upload ingest pipeline: ml_userriskscore_ingest_pipeline_{spaceId}
   */
  const createIngestPipelineOptions = getRiskScoreIngestPipelineOptions(riskScoreEntity, spaceId);
  const createIngestPipelineResult = await createIngestPipeline({
    esClient,
    logger,
    options: createIngestPipelineOptions,
  });

  return [createStoredScriptResult, createIngestPipelineResult];
};

const installUserRiskScoreModule = async ({
  esClient,
  logger,
  riskScoreEntity,
  spaceId,
}: InstallRiskScoreModule) => {
  const result = await Promise.all([
    /**
     * console_templates/enable_user_risk_score.console
     * Step 1 Upload script: ml_userriskscore_levels_script_{spaceId}
     * Step 4 Upload ingest pipeline: ml_userriskscore_ingest_pipeline_{spaceId}
     */
    createUserRiskScoreIngestPipelineGrouping({ esClient, logger, riskScoreEntity, spaceId }),
    /**
     * console_templates/enable_user_risk_score.console
     * Step 2 Upload script: ml_userriskscore_map_script_{spaceId}
     */
    createStoredScript({
      esClient,
      logger,
      options: getRiskUserCreateMapScriptOptions(spaceId),
    }),

    /**
     * console_templates/enable_user_risk_score.console
     * Step 3 Upload script: ml_userriskscore_reduce_script_{spaceId}
     */
    createStoredScript({
      esClient,
      logger,
      options: getRiskUserCreateReduceScriptOptions(spaceId),
    }),

    /**
     * console_templates/enable_user_risk_score.console
     * Step 5 create ml_user_risk_score_{spaceId} index
     */
    createIndex({
      esClient,
      logger,
      options: getCreateRiskScoreIndicesOptions({
        spaceId,
        riskScoreEntity,
      }),
    }),
    /**
     * console_templates/enable_user_risk_score.console
     * Step 8 create ml_user_risk_score_latest_{spaceId} index
     */
    createIndex({
      esClient,
      logger,
      options: getCreateRiskScoreLatestIndicesOptions({
        spaceId,
        riskScoreEntity,
      }),
    }),
  ]);

  /**
   * console_templates/enable_user_risk_score.console
   * Step 6 create Transform: ml_userriskscore_pivot_transform_{spaceId}
   * Step 7 Start the pivot transform
   */
  const createAndStartPivotTransformResult = await createAndStartTransform({
    esClient,
    logger,
    transformId: getRiskScorePivotTransformId(riskScoreEntity, spaceId),
    options: getCreateMLUserPivotTransformOptions({ spaceId }),
  });

  /**
   * console_templates/enable_user_risk_score.console
   * Step 9 create Transform: ml_userriskscore_latest_transform_{spaceId}
   * Step 10 Start the latest transform
   */
  const createAndStartLatestTransformResult = await createAndStartTransform({
    esClient,
    logger,
    transformId: getRiskScoreLatestTransformId(riskScoreEntity, spaceId),
    options: getCreateLatestTransformOptions({ riskScoreEntity, spaceId }),
  });

  return [
    ...result,
    createAndStartPivotTransformResult,
    createAndStartLatestTransformResult,
  ].flat();
};

export const installRiskScoreModule = async (settings: InstallRiskScoreModule) => {
  if (settings.riskScoreEntity === RiskScoreEntity.user) {
    const result = await installUserRiskScoreModule(settings);
    return result;
  } else {
    const result = await installHostRiskScoreModule(settings);
    return result;
  }
};
