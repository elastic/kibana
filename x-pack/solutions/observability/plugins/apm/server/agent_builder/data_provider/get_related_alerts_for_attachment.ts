/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERT_END,
  ALERT_REASON,
  ALERT_RULE_NAME,
  ALERT_RULE_TYPE_ID,
  ALERT_SEVERITY,
  ALERT_START,
  ALERT_STATUS,
  ALERT_STATUS_ACTIVE,
  ALERT_UUID,
} from '@kbn/rule-data-utils';
import { termQuery, rangeQuery } from '@kbn/observability-plugin/server';
import { SERVICE_NAME } from '../../../common/es_fields/apm';
import { environmentQuery } from '../../../common/utils/environment_query';
import type { ApmAlertsClient } from '../../lib/helpers/get_apm_alerts_client';
import type { AlertItem } from '../../../common/agent_builder/attachments';

const ALERT_SERVICE_NAME = SERVICE_NAME;

/** Maximum number of alert docs to return per attachment. */
const MAX_ALERTS = 20;

/**
 * Fetches active and recently recovered APM alerts for the given service,
 * returning them in the shape expected by `apmRelatedAlertsAttachmentDataSchema`.
 */
export async function getRelatedAlertsForAttachment({
  apmAlertsClient,
  serviceName,
  environment,
  start,
  end,
}: {
  apmAlertsClient: ApmAlertsClient;
  serviceName: string;
  environment?: string;
  /** epoch ms */
  start: number;
  /** epoch ms */
  end: number;
}): Promise<AlertItem[]> {
  const response = await apmAlertsClient.search({
    size: MAX_ALERTS,
    track_total_hits: false,
    query: {
      bool: {
        filter: [
          ...termQuery(ALERT_SERVICE_NAME, serviceName),
          ...(environment ? environmentQuery(environment) : []),
          // Include alerts that were active at any point within the window
          {
            bool: {
              should: [
                // Alert start is within the window
                ...rangeQuery(start, end, ALERT_START),
                // Alert is still active (no end yet) and started before the window ends
                {
                  bool: {
                    must_not: { exists: { field: ALERT_END } },
                    filter: { range: { [ALERT_START]: { lte: end } } },
                  },
                },
              ],
              minimum_should_match: 1,
            },
          },
        ],
      },
    },
    sort: [{ [ALERT_STATUS]: { order: 'asc' } }, { [ALERT_START]: { order: 'desc' } }],
    _source: [
      ALERT_UUID,
      ALERT_RULE_NAME,
      ALERT_RULE_TYPE_ID,
      ALERT_STATUS,
      ALERT_REASON,
      ALERT_SERVICE_NAME,
      ALERT_START,
      ALERT_END,
      ALERT_SEVERITY,
    ],
  });

  return response.hits.hits.map((hit): AlertItem => {
    const src = hit._source as Record<string, unknown>;

    const rawStart = src[ALERT_START];
    const startMs = typeof rawStart === 'string' ? new Date(rawStart).getTime() : Number(rawStart);

    const rawEnd = src[ALERT_END];
    const endMs =
      rawEnd != null
        ? typeof rawEnd === 'string'
          ? new Date(rawEnd).getTime()
          : Number(rawEnd)
        : undefined;

    const status = src[ALERT_STATUS] === ALERT_STATUS_ACTIVE ? 'active' : 'recovered';

    return {
      id: String(src[ALERT_UUID] ?? hit._id),
      ruleName: String(src[ALERT_RULE_NAME] ?? 'Unknown rule'),
      ruleTypeId: String(src[ALERT_RULE_TYPE_ID] ?? ''),
      status,
      reason: src[ALERT_REASON] != null ? String(src[ALERT_REASON]) : undefined,
      serviceName: src[ALERT_SERVICE_NAME] != null ? String(src[ALERT_SERVICE_NAME]) : undefined,
      start: startMs,
      duration: endMs != null ? endMs - startMs : undefined,
      severity: src[ALERT_SEVERITY] != null ? String(src[ALERT_SEVERITY]) : undefined,
    };
  });
}
