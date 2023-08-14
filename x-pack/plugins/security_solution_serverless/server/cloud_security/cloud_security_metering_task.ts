/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CNVM_POLICY_TEMPLATE,
  CSPM_POLICY_TEMPLATE,
  KSPM_POLICY_TEMPLATE,
  LATEST_FINDINGS_INDEX_PATTERN,
  LATEST_VULNERABILITIES_INDEX_PATTERN,
} from '@kbn/cloud-security-posture-plugin/common/constants';
import type { UsageRecord } from '../types';

import {
  AGGREGATION_PRECISION_THRESHOLD,
  CLOUD_SECURITY_TASK_TYPE,
} from './cloud_security_metering';
import { cloudSecurityMetringTaskProperties } from './cloud_security_metering_task_config';
import type {
  CloudSecurityMeteringCallbackInput,
  PostureType,
  ResourceCountAggregation,
} from './types';

const ASSETS_SAMPLE_GRANULARITY = '24h';

const queryParams = {
  [CSPM_POLICY_TEMPLATE]: {
    index: LATEST_FINDINGS_INDEX_PATTERN,
    assets_identifier: 'resource.id',
  },
  [KSPM_POLICY_TEMPLATE]: {
    index: LATEST_FINDINGS_INDEX_PATTERN,
    assets_identifier: 'agent.id',
  },
  [CNVM_POLICY_TEMPLATE]: {
    index: LATEST_VULNERABILITIES_INDEX_PATTERN,
    assets_identifier: 'cloud.instance.id',
  },
};

export const getCloudSecurityUsageRecord = async ({
  esClient,
  projectId,
  logger,
  taskId,
  postureType,
  tier,
  registeredProductTypes,
}: CloudSecurityMeteringCallbackInput): Promise<UsageRecord | undefined> => {
  try {
    if (!postureType) {
      logger.error('posture type is missing');
      return;
    }

    const response = await esClient.search<unknown, ResourceCountAggregation>(
      getAggQueryByPostureType(postureType)
    );

    if (!response.aggregations) {
      return;
    }
    const resourceCount = response.aggregations.unique_assets.value;
    if (resourceCount > AGGREGATION_PRECISION_THRESHOLD) {
      logger.warn(
        `The number of unique resources for {${postureType}} is ${resourceCount}, which is higher than the AGGREGATION_PRECISION_THRESHOLD of ${AGGREGATION_PRECISION_THRESHOLD}.`
      );
    }
    const minTimestamp = response.aggregations
      ? new Date(response.aggregations.min_timestamp.value_as_string).toISOString()
      : new Date().toISOString();

    const creationTimestamp = new Date().toISOString();

    const usageRecord = {
      id: `${CLOUD_SECURITY_TASK_TYPE}_${postureType}_${projectId}_${creationTimestamp}`,
      usage_timestamp: minTimestamp,
      creation_timestamp: creationTimestamp,
      usage: {
        type: CLOUD_SECURITY_TASK_TYPE,
        sub_type: postureType,
        quantity: resourceCount,
        period_seconds: cloudSecurityMetringTaskProperties.periodSeconds,
      },
      source: {
        id: taskId,
        instance_group_id: projectId,
        metadata: { tier, product_lines: registeredProductTypes },
      },
    };

    console.log(JSON.stringify(usageRecord));

    logger.debug(`Fetched ${postureType} metring data`);

    return usageRecord;
  } catch (err) {
    logger.error(`Failed to fetch ${postureType} metering data ${err}`);
  }
};

export const getAggQueryByPostureType = (postureType: PostureType) => {
  const mustFilters = [];

  mustFilters.push({
    range: {
      '@timestamp': {
        gte: `now-${ASSETS_SAMPLE_GRANULARITY}`,
      },
    },
  });

  if (postureType === CSPM_POLICY_TEMPLATE || postureType === KSPM_POLICY_TEMPLATE) {
    mustFilters.push({
      term: {
        'rule.benchmark.posture_type': postureType,
      },
    });
  }

  const query = {
    index: queryParams[postureType].index,
    query: {
      bool: {
        must: mustFilters,
      },
    },
    size: 0,
    aggs: {
      unique_assets: {
        cardinality: {
          field: queryParams[postureType].assets_identifier,
          precision_threshold: AGGREGATION_PRECISION_THRESHOLD,
        },
      },
      min_timestamp: {
        min: {
          field: '@timestamp',
        },
      },
    },
  };

  return query;
};
