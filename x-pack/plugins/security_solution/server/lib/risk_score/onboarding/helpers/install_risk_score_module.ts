/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import { RiskScoreEntity } from '../../../../../common/search_strategy';
import {
  getCreateRiskScoreIndicesOptions,
  getCreateRiskScoreLatestIndicesOptions,
  getRiskHostCreateInitScriptOptions,
  getRiskHostCreateLevelScriptOptions,
  getRiskHostCreateMapScriptOptions,
  getRiskHostCreateReduceScriptOptions,
  getRiskScoreIngestPipelineOptions,
  getRiskScoreLevelScriptId,
  getRiskUserCreateLevelScriptOptions,
  getRiskUserCreateMapScriptOptions,
  getRiskUserCreateReduceScriptOptions,
} from '../../../../../common/utils/risk_score_modules';
import { createIndex } from '../../indices/lib/create_index';
import { createStoredScript } from '../../stored_scripts/lib/create_script';
import type { Pipeline } from '../../../../../common/types/risk_scores';

interface InstallRiskScoreModule {
  client: IScopedClusterClient;
  riskScoreEntity: RiskScoreEntity;
  spaceId: string;
}

export interface ESProcessorConfig {
  on_failure?: Processor[];
  ignore_failure?: boolean;
  if?: string;
  tag?: string;
  [key: string]: unknown;
}

export interface Processor {
  [typeName: string]: ESProcessorConfig;
}

export interface Pipeline {
  name: string;
  description?: string;
  version?: number;
  processors: Processor[];
  on_failure?: Processor[];
  isManaged?: boolean;
}

const createIngestPipeline = async ({
  client,
  options,
}: {
  client: IScopedClusterClient;
  options: string | Pipeline;
}) => {
  const pipeline = typeof options === 'string' ? JSON.parse(options) : options;

  // eslint-disable-next-line @typescript-eslint/naming-convention
  const { name, description, processors, version, on_failure } = pipeline;

  try {
    await client.asCurrentUser.ingest.putPipeline({
      id: name,
      body: {
        description,
        processors,
        version,
        on_failure,
      },
    });

    return { [name]: { success: true } };
  } catch (error) {
    console.log('----+++++++--------');
    console.log(error);
    return { [name]: { error } };
  }
};

const hostRiskScoreIngestPipelineGrouping = async ({
  client,
  riskScoreEntity,
  spaceId,
}: InstallRiskScoreModule) => {
  /**
   * console_templates/enable_host_risk_score.console
   * Step 1 Upload script: ml_hostriskscore_levels_script_{spaceId}
   */
  const createLevelScriptOptions = getRiskHostCreateLevelScriptOptions(spaceId);

  const createStoredScriptResult = await createStoredScript({
    client,
    options: createLevelScriptOptions,
  });

  /**
   * console_templates/enable_host_risk_score.console
   * Step 5 Upload the ingest pipeline: ml_hostriskscore_ingest_pipeline_{spaceId}
   */
  const createIngestPipelineOptions = getRiskScoreIngestPipelineOptions(riskScoreEntity, spaceId);
  const createIngestPipelineResult = await createIngestPipeline({
    client,
    options: createIngestPipelineOptions,
  });

  return [createStoredScriptResult, createIngestPipelineResult];
};

const installHostRiskScoreModule = async ({
  client,
  riskScoreEntity,
  spaceId,
}: InstallRiskScoreModule) => {
  const result = await Promise.all([
    hostRiskScoreIngestPipelineGrouping({
      client,
      riskScoreEntity,
      spaceId,
    }),
    /**
     * console_templates/enable_host_risk_score.console
     * Step 2 Upload script: ml_hostriskscore_init_script_{spaceId}
     */
    createStoredScript({
      client,
      options: getRiskHostCreateInitScriptOptions(spaceId),
    }),

    /**
     * console_templates/enable_host_risk_score.console
     * Step 3 Upload script: ml_hostriskscore_map_script_{spaceId}
     */
    createStoredScript({
      client,
      options: getRiskHostCreateMapScriptOptions(spaceId),
    }),

    /**
     * console_templates/enable_host_risk_score.console
     * Step 4 Upload script: ml_hostriskscore_reduce_script_{spaceId}
     */
    createStoredScript({
      client,
      options: getRiskHostCreateReduceScriptOptions(spaceId),
    }),

    /**
     * console_templates/enable_host_risk_score.console
     * Step 6 create ml_host_risk_score_{spaceId} index
     */
    createIndex({
      client,
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
      client,
      options: getCreateRiskScoreLatestIndicesOptions({
        spaceId,
        riskScoreEntity,
      }),
    }),
  ]);

  return result.flat();
};

const userRiskScoreIngestPipelineGrouping = async ({
  client,
  riskScoreEntity,
  spaceId,
}: InstallRiskScoreModule) => {
  /**
   * console_templates/enable_user_risk_score.console
   * Step 1 Upload script: ml_userriskscore_levels_script_{spaceId}
   */
  const createLevelScriptOptions = getRiskUserCreateLevelScriptOptions(spaceId);

  const createStoredScriptResult = await createStoredScript({
    client,
    options: createLevelScriptOptions,
  });

  /**
   * console_templates/enable_user_risk_score.console
   * Step 4 Upload ingest pipeline: ml_userriskscore_ingest_pipeline_{spaceId}
   */
  const createIngestPipelineOptions = getRiskScoreIngestPipelineOptions(riskScoreEntity, spaceId);
  const createIngestPipelineResult = await createIngestPipeline({
    client,
    options: createIngestPipelineOptions,
  });

  return [createStoredScriptResult, createIngestPipelineResult];
};

const installUserRiskScoreModule = async ({
  client,
  riskScoreEntity,
  spaceId,
}: InstallRiskScoreModule) => {
  const result = await Promise.all([
    userRiskScoreIngestPipelineGrouping({ client, riskScoreEntity, spaceId }),
    /**
     * console_templates/enable_user_risk_score.console
     * Step 5 create ml_user_risk_score_{spaceId} index
     */
    createIndex({
      client,
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
      client,
      options: getCreateRiskScoreLatestIndicesOptions({
        spaceId,
        riskScoreEntity,
      }),
    }),
    /**
     * console_templates/enable_user_risk_score.console
     * Step 2 Upload script: ml_userriskscore_map_script_{spaceId}
     */
    createStoredScript({
      client,
      options: getRiskUserCreateMapScriptOptions(spaceId),
    }),

    /**
     * console_templates/enable_user_risk_score.console
     * Step 3 Upload script: ml_userriskscore_reduce_script_{spaceId}
     */
    createStoredScript({
      client,
      options: getRiskUserCreateReduceScriptOptions(spaceId),
    }),
  ]);

  return result.flat();
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
