/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { Logger } from '@kbn/logging';
import {
  ALERT_RULE_UUID,
  ALERT_STATUS,
  ALERT_STATUS_ACTIVE,
  ALERT_STATUS_UNTRACKED,
  ALERT_UUID,
} from '@kbn/rule-data-utils';

export interface SetAlertsToUntrackedOpts {
  indices: string[];
  ruleIds?: string[];
  alertUuids?: string[];
}

export async function setAlertsToUntracked({
  logger,
  esClient,
  indices,
  ruleIds = [],
  alertUuids = [], // OPTIONAL - If no alertUuids are passed, untrack ALL ids by default
}: {
  logger: Logger;
  esClient: ElasticsearchClient;
} & SetAlertsToUntrackedOpts) {
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
        [ALERT_STATUS]: { value: ALERT_STATUS_ACTIVE },
      },
    },
  ];

  const must = [
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

  try {
    // Retry this updateByQuery up to 3 times to make sure the number of documents
    // updated equals the number of documents matched
    for (let retryCount = 0; retryCount < 3; retryCount++) {
      const response = await esClient.updateByQuery({
        index: indices,
        allow_no_indices: true,
        body: {
          conflicts: 'proceed',
          script: {
            source: UNTRACK_UPDATE_PAINLESS_SCRIPT,
            lang: 'painless',
          },
          query: {
            bool: {
              must,
            },
          },
        },
      });
      if (response.total === response.updated) break;
      logger.warn(
        `Attempt ${retryCount + 1}: Failed to untrack ${
          (response.total ?? 0) - (response.updated ?? 0)
        } of ${response.total}; indices ${indices}, ruleIds ${ruleIds}`
      );
    }
  } catch (err) {
    logger.error(`Error marking ${ruleIds} as untracked - ${err.message}`);
  }
}

const UNTRACK_UPDATE_PAINLESS_SCRIPT = `
// Certain rule types don't flatten their AAD values, apply the ALERT_STATUS key to them directly
if (!ctx._source.containsKey('${ALERT_STATUS}') || ctx._source['${ALERT_STATUS}'].empty) {
  ctx._source.${ALERT_STATUS} = '${ALERT_STATUS_UNTRACKED}';
} else {
  ctx._source['${ALERT_STATUS}'] = '${ALERT_STATUS_UNTRACKED}'
}`;
