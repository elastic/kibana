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
import { ProductLine } from '../../common/product';
import { getCloudSecurityUsageRecord } from './cloud_security_metering_task';
import type { PostureType } from './types';
import type { MeteringCallbackInput, Tier, UsageRecord } from '../types';
import type { ServerlessSecurityConfig } from '../config';

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
  const projectId = cloudSetup?.serverless?.projectId || 'missing_project_id';

  if (!cloudSetup?.serverless?.projectId) {
    logger.error('no project id found');
  }

  const tier: Tier = getCloudProductTier(config);

  try {
    const postureTypes: PostureType[] = [
      CSPM_POLICY_TEMPLATE,
      KSPM_POLICY_TEMPLATE,
      CNVM_POLICY_TEMPLATE,
    ];

    const cloudSecurityUsageRecords = await Promise.all(
      postureTypes.map((postureType) =>
        getCloudSecurityUsageRecord({
          esClient,
          projectId,
          logger,
          taskId,
          lastSuccessfulReport,
          postureType,
          tier,
        })
      )
    );

    // remove any potential undefined values from the array,
    return cloudSecurityUsageRecords.filter(Boolean) as UsageRecord[];
  } catch (err) {
    logger.error(`Failed to fetch Cloud Security metering data ${err}`);
    return [];
  }
};

export const getCloudProductTier = (config: ServerlessSecurityConfig): Tier => {
  const cloud = config.productTypes.find(
    (productType) => productType.product_line === ProductLine.cloud
  );
  const tier = cloud ? cloud.product_tier : 'none';

  return tier;
};
