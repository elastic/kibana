/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PublicContract } from '@kbn/utility-types';
import { ESSearchRequest, ESSearchResponse } from '@kbn/es-types';
import type { GetSummarizedAlertsFnOpts } from '@kbn/alerting-plugin/server';
import {
  ALERT_RULE_EXECUTION_UUID,
  ALERT_RULE_UUID,
  ALERT_END,
  ALERT_START,
  EVENT_ACTION,
  TIMESTAMP,
} from '@kbn/rule-data-utils';
import { ParsedTechnicalFields } from '../../common';
import { ParsedExperimentalFields } from '../../common/parse_experimental_fields';
import { IRuleDataClient, IRuleDataReader } from '../rule_data_client';

type AlertDocument = Partial<ParsedTechnicalFields & ParsedExperimentalFields>;

interface CreateGetSummarizedAlertsFnOpts {
  ruleDataClient: PublicContract<IRuleDataClient>;
  useNamespace: boolean;
  isLifecycleAlert: boolean;
}

export const createGetSummarizedAlertsFn =
  (opts: CreateGetSummarizedAlertsFnOpts) =>
  () =>
  async ({ start, end, executionUuid, ruleId, spaceId }: GetSummarizedAlertsFnOpts) => {
    if (!ruleId || !spaceId) {
      throw new Error(`Must specify both rule ID and space ID for summarized alert query.`);
    }
    const queryByExecutionUuid: boolean = !!start && !!end;
    const queryByTimeRange: boolean = !!executionUuid;
    // Either executionUuid or start/end dates must be specified, but not both
    if (
      (!queryByExecutionUuid && !queryByTimeRange) ||
      (queryByExecutionUuid && queryByTimeRange)
    ) {
      throw new Error(
        `Must specify either execution UUID or time range for summarized alert query.`
      );
    }

    // Get the rule data client reader
    const { ruleDataClient, useNamespace } = opts;
    const ruleDataClientReader = useNamespace
      ? ruleDataClient.getReader({ namespace: spaceId })
      : ruleDataClient.getReader();

    if (queryByExecutionUuid) {
      return await getAlertsByExecutionUuid({
        ruleDataClientReader,
        ruleId,
        executionUuid: executionUuid!,
        isLifecycleAlert: opts.isLifecycleAlert,
      });
    }

    return await getAlertsByTimeRange({
      ruleDataClientReader,
      ruleId,
      start: start!,
      end: end!,
      isLifecycleAlert: opts.isLifecycleAlert,
    });
  };

interface GetAlertsByExecutionUuidOpts {
  executionUuid: string;
  ruleId: string;
  ruleDataClientReader: IRuleDataReader;
  isLifecycleAlert: boolean;
}

const getAlertsByExecutionUuid = async <TSearchRequest extends ESSearchRequest>({
  executionUuid,
  ruleId,
  ruleDataClientReader,
  isLifecycleAlert,
}: GetAlertsByExecutionUuidOpts) => {
  const request = {
    body: {
      size: 10000,
      query: {
        bool: {
          filter: [
            {
              term: {
                [ALERT_RULE_EXECUTION_UUID]: executionUuid,
              },
            },
            {
              term: {
                [ALERT_RULE_UUID]: ruleId,
              },
            },
          ],
        },
      },
    },
  };

  const response = (await ruleDataClientReader.search(request)) as ESSearchResponse<
    AlertDocument,
    TSearchRequest
  >;
  const alertHits = response.hits.hits;

  // For lifecycle alerts, new/ongoing/recovered statuses can be read
  // from the alert documents from a single execution
  // For non-lifecycle alerts (persistent), all alerts from an execution are
  // new, no alerts are ongoing or recovered
  return {
    new: isLifecycleAlert
      ? alertHits.filter((hit) => hit._source[EVENT_ACTION] === 'open')
      : alertHits,
    ongoing: isLifecycleAlert
      ? alertHits.filter((hit) => hit._source[EVENT_ACTION] === 'active')
      : [],
    recovered: isLifecycleAlert
      ? alertHits.filter((hit) => hit._source[EVENT_ACTION] === 'close')
      : [],
  };
};

interface GetAlertsByTimeRangeOpts {
  start: Date;
  end: Date;
  ruleId: string;
  ruleDataClientReader: IRuleDataReader;
  isLifecycleAlert: boolean;
}

const getAlertsByTimeRange = async <TSearchRequest extends ESSearchRequest>({
  start,
  end,
  ruleId,
  ruleDataClientReader,
  isLifecycleAlert,
}: GetAlertsByTimeRangeOpts) => {
  const request = {
    body: {
      size: 10000,
      query: {
        bool: {
          filter: [
            {
              range: {
                [TIMESTAMP]: {
                  gte: start?.toISOString(),
                  lte: end?.toISOString(),
                },
              },
            },
            {
              term: {
                [ALERT_RULE_UUID]: ruleId,
              },
            },
          ],
        },
      },
    },
  };
  const response = (await ruleDataClientReader.search(request)) as ESSearchResponse<
    AlertDocument,
    TSearchRequest
  >;
  const alertHits = response.hits.hits;

  // For lifecycle alerts, new/ongoing/recovered statuses can be inferred
  // from the alert document timestamps
  // For non-lifecycle alerts (persistent), all alerts from an execution are
  // new, no alerts are ongoing or recovered
  return {
    new: isLifecycleAlert
      ? alertHits.filter((hit) => {
          const alertStart = new Date(hit._source[ALERT_START]!);
          return alertStart >= start && alertStart <= end;
        })
      : alertHits,
    ongoing: isLifecycleAlert
      ? alertHits.filter((hit) => {
          const alertStart = new Date(hit._source[ALERT_START]!);
          return alertStart < start && hit._source[ALERT_END] == null;
        })
      : [],
    recovered: isLifecycleAlert
      ? alertHits.filter((hit) => {
          return hit._source[ALERT_END] != null;
        })
      : [],
  };
};
