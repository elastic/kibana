/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract, Logger } from '@kbn/core/server';
import type { MlPluginSetup } from '@kbn/ml-plugin/server';
import type { DetectionMetrics } from './types';

import { getMlJobMetrics } from './ml_jobs/get_metrics';
import { getRuleMetrics } from './rules/get_metrics';
import { getInitialEventLogUsage, getInitialRulesUsage } from './rules/get_initial_usage';
import { getInitialMlJobUsage } from './ml_jobs/get_initial_usage';
// eslint-disable-next-line no-restricted-imports
import { getInitialLegacySiemSignalsUsage } from './legacy_siem_signals/get_initial_usage';
// eslint-disable-next-line no-restricted-imports
import { getLegacySiemSignalsUsage } from './legacy_siem_signals/get_legacy_siem_signals_metrics';

export interface GetDetectionsMetricsOptions {
  signalsIndex: string;
  esClient: ElasticsearchClient;
  savedObjectsClient: SavedObjectsClientContract;
  logger: Logger;
  mlClient: MlPluginSetup | undefined;
  eventLogIndex: string;
  legacySignalsIndex: string;
}

export const getDetectionsMetrics = async ({
  eventLogIndex,
  signalsIndex,
  esClient,
  savedObjectsClient,
  logger,
  mlClient,
  legacySignalsIndex,
}: GetDetectionsMetricsOptions): Promise<DetectionMetrics> => {
  const [mlJobMetrics, detectionRuleMetrics, legacySiemSignalsUsage] = await Promise.allSettled([
    getMlJobMetrics({ mlClient, savedObjectsClient, logger }),
    getRuleMetrics({ signalsIndex, eventLogIndex, esClient, savedObjectsClient, logger }),
    getLegacySiemSignalsUsage({ signalsIndex: legacySignalsIndex, esClient, logger }),
  ]);

  return {
    ml_jobs:
      mlJobMetrics.status === 'fulfilled'
        ? mlJobMetrics.value
        : { ml_job_metrics: [], ml_job_usage: getInitialMlJobUsage() },
    detection_rules:
      detectionRuleMetrics.status === 'fulfilled'
        ? detectionRuleMetrics.value
        : {
            detection_rule_detail: [],
            detection_rule_usage: getInitialRulesUsage(),
            detection_rule_status: getInitialEventLogUsage(),
          },
    legacy_siem_signals:
      legacySiemSignalsUsage.status === 'fulfilled'
        ? legacySiemSignalsUsage.value
        : getInitialLegacySiemSignalsUsage(),
  };
};
