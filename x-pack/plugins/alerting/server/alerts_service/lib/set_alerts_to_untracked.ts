/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { Logger } from '@kbn/logging';
import {
  ALERT_END,
  ALERT_RULE_CONSUMER,
  ALERT_RULE_TYPE_ID,
  ALERT_RULE_UUID,
  ALERT_STATUS,
  ALERT_STATUS_ACTIVE,
  ALERT_STATUS_UNTRACKED,
  ALERT_TIME_RANGE,
  ALERT_UUID,
  AlertStatus,
} from '@kbn/rule-data-utils';

export interface SetAlertsToUntrackedOpts {
  indices: string[];
  ruleIds?: string[];
  alertUuids?: string[];
  ensureAuthorized?: (opts: { ruleTypeId: string; consumer: string }) => Promise<unknown>;
}

type UntrackedAlertsResult = Array<{ [ALERT_RULE_UUID]: string; [ALERT_UUID]: string }>;
interface ConsumersAndRuleTypesAggregation {
  ruleTypeIds: {
    buckets: Array<{
      key: string;
      consumers: {
        buckets: Array<{ key: string }>;
      };
    }>;
  };
}

const getQuery = ({
  ruleIds = [],
  alertUuids = [],
  alertStatus,
}: {
  ruleIds?: string[];
  alertUuids?: string[];
  alertStatus: AlertStatus;
}) => {
  const shouldMatchRules: Array<{ term: Record<string, { value: string }> }> = ruleIds.map(
    (ruleId) => ({
      term: {
        [ALERT_RULE_UUID]: { value: ruleId },
      },
    })
  );
  const shouldMatchAlerts: Array<{ term: Record<string, { value: string }> }> = alertUuids.map(
    (alertId) => ({
      term: {
        [ALERT_UUID]: { value: alertId },
      },
    })
  );

  const statusTerms: Array<{ term: Record<string, { value: string }> }> = [
    {
      term: {
        [ALERT_STATUS]: { value: alertStatus },
      },
    },
  ];

  return [
    ...statusTerms,
    {
      bool: {
        should: shouldMatchRules,
      },
    },
    {
      bool: {
        should: shouldMatchAlerts,
        // If this is empty, ES will default to minimum_should_match: 0
      },
    },
  ];
};

export async function setAlertsToUntracked({
  logger,
  esClient,
  indices,
  ruleIds = [],
  alertUuids = [], // OPTIONAL - If no alertUuids are passed, untrack ALL ids by default,
  ensureAuthorized,
}: {
  logger: Logger;
  esClient: ElasticsearchClient;
} & SetAlertsToUntrackedOpts): Promise<UntrackedAlertsResult> {
  if (isEmpty(ruleIds) && isEmpty(alertUuids))
    throw new Error('Must provide either ruleIds or alertUuids');

  if (ensureAuthorized) {
    // Fetch all rule type IDs and rule consumers, then run the provided ensureAuthorized check for each of them
    const response = await esClient.search<never, ConsumersAndRuleTypesAggregation>({
      index: indices,
      allow_no_indices: true,
      body: {
        size: 0,
        query: {
          bool: {
            must: getQuery({
              ruleIds,
              alertUuids,
              alertStatus: ALERT_STATUS_ACTIVE,
            }),
          },
        },
        aggs: {
          ruleTypeIds: {
            terms: { field: ALERT_RULE_TYPE_ID },
            aggs: { consumers: { terms: { field: ALERT_RULE_CONSUMER } } },
          },
        },
      },
    });
    const ruleTypeIdBuckets = response.aggregations?.ruleTypeIds.buckets;
    if (!ruleTypeIdBuckets) throw new Error('Unable to fetch ruleTypeIds for authorization');
    for (const {
      key: ruleTypeId,
      consumers: { buckets: consumerBuckets },
    } of ruleTypeIdBuckets) {
      const consumers = consumerBuckets.map((b) => b.key);
      for (const consumer of consumers) {
        if (consumer === 'siem') throw new Error('Untracking Security alerts is not permitted');
        await ensureAuthorized({ ruleTypeId, consumer });
      }
    }
  }

  try {
    // Retry this updateByQuery up to 3 times to make sure the number of documents
    // updated equals the number of documents matched
    let total = 0;
    for (let retryCount = 0; retryCount < 3; retryCount++) {
      const response = await esClient.updateByQuery({
        index: indices,
        allow_no_indices: true,
        body: {
          conflicts: 'proceed',
          script: {
            source: getUntrackUpdatePainlessScript(new Date()),
            lang: 'painless',
          },
          query: {
            bool: {
              must: getQuery({
                ruleIds,
                alertUuids,
                alertStatus: ALERT_STATUS_ACTIVE,
              }),
            },
          },
        },
        refresh: true,
      });
      if (total === 0 && response.total === 0)
        throw new Error('No active alerts matched the query');
      if (response.total) total = response.total;
      if (response.total === response.updated) break;
      logger.warn(
        `Attempt ${retryCount + 1}: Failed to untrack ${
          (response.total ?? 0) - (response.updated ?? 0)
        } of ${response.total}; indices ${indices}, ${ruleIds ? 'ruleIds' : 'alertUuids'} ${
          ruleIds ? ruleIds : alertUuids
        }`
      );
    }

    // Fetch and return updated rule and alert instance UUIDs
    const searchResponse = await esClient.search({
      index: indices,
      allow_no_indices: true,
      body: {
        _source: [ALERT_RULE_UUID, ALERT_UUID],
        size: total,
        query: {
          bool: {
            must: getQuery({
              ruleIds,
              alertUuids,
              alertStatus: ALERT_STATUS_UNTRACKED,
            }),
          },
        },
      },
    });
    return searchResponse.hits.hits.map((hit) => hit._source) as UntrackedAlertsResult;
  } catch (err) {
    logger.error(
      `Error marking ${ruleIds ? 'ruleIds' : 'alertUuids'} ${
        ruleIds ? ruleIds : alertUuids
      } as untracked - ${err.message}`
    );
    throw err;
  }
}

// Certain rule types don't flatten their AAD values, apply the ALERT_STATUS key to them directly
const getUntrackUpdatePainlessScript = (now: Date) => `
if (!ctx._source.containsKey('${ALERT_STATUS}') || ctx._source['${ALERT_STATUS}'].empty) {
  ctx._source.${ALERT_STATUS} = '${ALERT_STATUS_UNTRACKED}';
  ctx._source.${ALERT_END} = '${now.toISOString()}';
  ctx._source.${ALERT_TIME_RANGE}.lte = '${now.toISOString()}';
} else {
  ctx._source['${ALERT_STATUS}'] = '${ALERT_STATUS_UNTRACKED}';
  ctx._source['${ALERT_END}'] = '${now.toISOString()}';
  ctx._source['${ALERT_TIME_RANGE}'].lte = '${now.toISOString()}';
}`;
