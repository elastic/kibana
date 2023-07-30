/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MeteringCallbackInput, UsageRecord } from '../types';
import { getCspmUsageRecord } from './cspm_metering_task';
import { getKspmUsageRecord } from './kspm_metering_task';
import { getCnvmUsageRecord } from './cnvm_metering_task';

export const CLOUD_SECURITY_TASK_TYPE = 'Cloud_Security';
export const AGGREGATION_PRECISION_THRESHOLD = 3000;

export const cloudSecurityMetringCallback = async ({
  esClient,
  cloudSetup,
  logger,
  taskId,
  lastSuccessfulReport,
  abortController,
}: MeteringCallbackInput): Promise<UsageRecord[]> => {
  const projectId = cloudSetup?.serverless?.projectId || 'missing project id';

  if (!cloudSetup?.serverless?.projectId) {
    logger.error('no project id found');
  }

  try {
    const cloudSecurityUsageRecords: UsageRecord[] = [];

    const usageRecordFunctions = [getCspmUsageRecord, getKspmUsageRecord, getCnvmUsageRecord];

    for (const usageRecordFunction of usageRecordFunctions) {
      const usageRecord = await usageRecordFunction({
        esClient,
        projectId,
        logger,
        taskId,
        lastSuccessfulReport,
        abortController,
      });

      if (usageRecord) {
        cloudSecurityUsageRecords.push(usageRecord);
      }
    }

    return cloudSecurityUsageRecords;
  } catch (err) {
    logger.error(`Failed to fetch Cloud Security metering data ${err}`);
    return [];
  }
};
