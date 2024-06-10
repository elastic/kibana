/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Logger } from '@kbn/core/server';
import { ProductLine } from '../../common/product';
import { getCloudSecurityUsageRecord } from './cloud_security_metering_task';
import { CLOUD_DEFEND, CNVM, CSPM, KSPM } from './constants';
import type { CloudSecuritySolutions } from './types';
import type { MeteringCallBackResponse, MeteringCallbackInput, Tier, UsageRecord } from '../types';
import type { ServerlessSecurityConfig } from '../config';
import { getCloudDefendUsageRecords } from './defend_for_containers_metering';

export const cloudSecurityMetringCallback = async ({
  esClient,
  cloudSetup,
  logger,
  taskId,
  lastSuccessfulReport,
  config,
}: MeteringCallbackInput): Promise<MeteringCallBackResponse> => {
  const projectId = cloudSetup?.serverless?.projectId || 'missing_project_id';

  const tier: Tier = getCloudProductTier(config, logger);

  try {
    const cloudSecuritySolutions: CloudSecuritySolutions[] = [CSPM, KSPM, CNVM, CLOUD_DEFEND];

    const promiseResults = await Promise.allSettled(
      cloudSecuritySolutions.map((cloudSecuritySolution) => {
        if (cloudSecuritySolution === CLOUD_DEFEND) {
          return getCloudDefendUsageRecords({
            esClient,
            projectId,
            logger,
            taskId,
            lastSuccessfulReport,
            cloudSecuritySolution,
            tier,
          });
        }
        return getCloudSecurityUsageRecord({
          esClient,
          projectId,
          logger,
          taskId,
          lastSuccessfulReport,
          cloudSecuritySolution,
          tier,
        });
      })
    );

    const cloudSecurityUsageRecords: UsageRecord[] = [];
    promiseResults.forEach((result) => {
      if (result.status === 'fulfilled') {
        if (result.value !== undefined && result.value.length > 0) {
          cloudSecurityUsageRecords.push(...result.value);
        }
      } else {
        // Handle or log the rejection reason
        logger.error(`Promise rejected with reason: ${result.reason}`);
      }
    });

    return { records: cloudSecurityUsageRecords };
  } catch (err) {
    logger.error(`Failed to process Cloud Security metering data ${err}`);
    return { records: [] };
  }
};

export const getCloudProductTier = (config: ServerlessSecurityConfig, logger: Logger): Tier => {
  const cloud = config.productTypes.find(
    (productType) => productType.product_line === ProductLine.cloud
  );
  const tier = cloud ? cloud.product_tier : 'none';
  if (tier === 'none') {
    logger.error(`Failed to fetch cloud product tier, config: ${JSON.stringify(config)}`);
  }

  return tier;
};
