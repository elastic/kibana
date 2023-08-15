/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CSPM_POLICY_TEMPLATE,
  KSPM_POLICY_TEMPLATE,
  CNVM_POLICY_TEMPLATE,
} from '@kbn/cloud-security-posture-plugin/common/constants';
import { getCloudSecurityUsageRecord } from './cloud_security_metering_task';
import type { PostureType, Tier } from './types';
import type { MeteringCallbackInput, UsageRecord } from '../types';
import { ProductLine } from '@kbn/security-solution-serverless/common/product';
import { ServerlessSecurityConfig } from '../config';

export const CLOUD_SECURITY_TASK_TYPE = 'cloud_security';
export const AGGREGATION_PRECISION_THRESHOLD = 40000;

export const cloudSecurityMetringCallback = async ({
  esClient,
  cloudSetup,
  logger,
  taskId,
  lastSuccessfulReport,
  config,
}: MeteringCallbackInput): Promise<UsageRecord[]> => {
  const projectId = cloudSetup?.serverless?.projectId || 'missing project id';

  if (!cloudSetup?.serverless?.projectId) {
    logger.error('no project id found');
  }

  const tier: Tier = getProductTier(config);
  const registeredProductTypes = config.productTypes;

  try {
    const cloudSecurityUsageRecords: UsageRecord[] = [];

    const postureTypes: PostureType[] = [
      CSPM_POLICY_TEMPLATE,
      KSPM_POLICY_TEMPLATE,
      CNVM_POLICY_TEMPLATE,
    ];

    for (const postureType of postureTypes) {
      const usageRecord = await getCloudSecurityUsageRecord({
        esClient,
        projectId,
        logger,
        taskId,
        lastSuccessfulReport,
        postureType,
        tier,
        registeredProductTypes,
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

export const getProductTier = (config: ServerlessSecurityConfig) => {
  const cloud = config.productTypes.find(
    (productType) => productType.product_line === ProductLine.cloud
  );
  const tier = cloud ? cloud.product_tier : 'none';

  return tier;
};
