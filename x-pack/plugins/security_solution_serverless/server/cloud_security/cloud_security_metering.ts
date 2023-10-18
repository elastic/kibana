/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ProductLine } from '../../common/product';
import { getCloudSecurityUsageRecord } from './cloud_security_metering_task';
import { CLOUD_DEFEND, CNVM, CSPM, KSPM } from './constants';
import type { CloudSecuritySolutions } from './types';
import type { MeteringCallbackInput, Tier, UsageRecord } from '../types';
import type { ServerlessSecurityConfig } from '../config';

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
    const cloudSecuritySolutions: CloudSecuritySolutions[] = [CSPM, KSPM, CNVM, CLOUD_DEFEND];

    const cloudSecurityUsageRecords = await Promise.all(
      cloudSecuritySolutions.map((cloudSecuritySolution) =>
        getCloudSecurityUsageRecord({
          esClient,
          projectId,
          logger,
          taskId,
          lastSuccessfulReport,
          cloudSecuritySolution,
          tier,
        })
      )
    );

    // remove any potential undefined values from the array,
    return cloudSecurityUsageRecords
      .filter((record) => record !== undefined && record.length > 0)
      .flatMap((record) => record) as UsageRecord[];
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
