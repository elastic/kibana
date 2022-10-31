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
  ALERT_END,
  ALERT_RULE_EXECUTION_UUID,
  ALERT_RULE_UUID,
  ALERT_START,
  EVENT_ACTION,
  TIMESTAMP,
} from '@kbn/rule-data-utils';
import {
  QueryDslQueryContainer,
  SearchTotalHits,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ParsedTechnicalFields } from '../../common';
import { ParsedExperimentalFields } from '../../common/parse_experimental_fields';
import { IRuleDataClient, IRuleDataReader } from '../rule_data_client';

const MAX_ALERT_DOCS_TO_RETURN = 1000;
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
    const queryByExecutionUuid: boolean = !!executionUuid;
    const queryByTimeRange: boolean = !!start && !!end;
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

const getAlertsByExecutionUuid = async ({
  executionUuid,
  ruleId,
  ruleDataClientReader,
  isLifecycleAlert,
}: GetAlertsByExecutionUuidOpts) => {
  if (isLifecycleAlert) {
    return getLifecycleAlertsByExecutionUuid({ executionUuid, ruleId, ruleDataClientReader });
  }

  return getPersistentAlertsByExecutionUuid({ executionUuid, ruleId, ruleDataClientReader });
};

interface GetAlertsByExecutionUuidHelperOpts {
  executionUuid: string;
  ruleId: string;
  ruleDataClientReader: IRuleDataReader;
}

const getPersistentAlertsByExecutionUuid = async <TSearchRequest extends ESSearchRequest>({
  executionUuid,
  ruleId,
  ruleDataClientReader,
}: GetAlertsByExecutionUuidHelperOpts) => {
  // persistent alerts only create new alerts so query by execution UUID to
  // get all alerts created during an execution
  const request = getQueryByExecutionUuid(executionUuid, ruleId);
  const response = (await ruleDataClientReader.search(request)) as ESSearchResponse<
    AlertDocument,
    TSearchRequest
  >;

  return {
    new: getHitsWithCount(response),
    ongoing: {
      count: 0,
      alerts: [],
    },
    recovered: {
      count: 0,
      alerts: [],
    },
  };
};

const getLifecycleAlertsByExecutionUuid = async ({
  executionUuid,
  ruleId,
  ruleDataClientReader,
}: GetAlertsByExecutionUuidHelperOpts) => {
  // lifecycle alerts assign a different action to an alert depending
  // on whether it is new/ongoing/recovered. query for each action in order
  // to get the count of each action type as well as up to the maximum number
  // of each type of alert.
  const requests = [
    getQueryByExecutionUuid(executionUuid, ruleId, 'open'),
    getQueryByExecutionUuid(executionUuid, ruleId, 'active'),
    getQueryByExecutionUuid(executionUuid, ruleId, 'close'),
  ];

  const responses = await Promise.all(
    requests.map((request) => ruleDataClientReader.search(request))
  );

  return {
    new: getHitsWithCount(responses[0]),
    ongoing: getHitsWithCount(responses[1]),
    recovered: getHitsWithCount(responses[2]),
  };
};

const getHitsWithCount = <TSearchRequest extends ESSearchRequest>(
  response: ESSearchResponse<AlertDocument, TSearchRequest>
) => {
  return {
    count: (response.hits.total as SearchTotalHits).value,
    alerts: response.hits.hits.map((r) => r._source),
  };
};

const getQueryByExecutionUuid = (executionUuid: string, ruleId: string, action?: string) => {
  const filter: QueryDslQueryContainer[] = [
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
  ];
  if (action) {
    filter.push({
      term: {
        [EVENT_ACTION]: action,
      },
    });
  }

  return {
    body: {
      size: MAX_ALERT_DOCS_TO_RETURN,
      track_total_hits: true,
      query: {
        bool: {
          filter,
        },
      },
    },
  };
};

interface GetAlertsByTimeRangeOpts {
  start: Date;
  end: Date;
  ruleId: string;
  ruleDataClientReader: IRuleDataReader;
  isLifecycleAlert: boolean;
}

const getAlertsByTimeRange = async ({
  start,
  end,
  ruleId,
  ruleDataClientReader,
  isLifecycleAlert,
}: GetAlertsByTimeRangeOpts) => {
  if (isLifecycleAlert) {
    return getLifecycleAlertsByTimeRange({ start, end, ruleId, ruleDataClientReader });
  }

  return getPersistentAlertsByTimeRange({ start, end, ruleId, ruleDataClientReader });
};

interface GetAlertsByTimeRangeHelperOpts {
  start: Date;
  end: Date;
  ruleId: string;
  ruleDataClientReader: IRuleDataReader;
}

enum AlertTypes {
  NEW = 0,
  ONGOING,
  RECOVERED,
}

const getPersistentAlertsByTimeRange = async <TSearchRequest extends ESSearchRequest>({
  start,
  end,
  ruleId,
  ruleDataClientReader,
}: GetAlertsByTimeRangeHelperOpts) => {
  // persistent alerts only create new alerts so query by execution UUID to
  // get all alerts created during an execution
  const request = getQueryByTimeRange(start, end, ruleId);
  const response = (await ruleDataClientReader.search(request)) as ESSearchResponse<
    AlertDocument,
    TSearchRequest
  >;

  return {
    new: getHitsWithCount(response),
    ongoing: {
      count: 0,
      alerts: [],
    },
    recovered: {
      count: 0,
      alerts: [],
    },
  };
};

const getLifecycleAlertsByTimeRange = async ({
  start,
  end,
  ruleId,
  ruleDataClientReader,
}: GetAlertsByTimeRangeHelperOpts) => {
  const requests = [
    getQueryByTimeRange(start, end, ruleId, AlertTypes.NEW),
    getQueryByTimeRange(start, end, ruleId, AlertTypes.ONGOING),
    getQueryByTimeRange(start, end, ruleId, AlertTypes.RECOVERED),
  ];

  const responses = await Promise.all(
    requests.map((request) => ruleDataClientReader.search(request))
  );

  return {
    new: getHitsWithCount(responses[0]),
    ongoing: getHitsWithCount(responses[1]),
    recovered: getHitsWithCount(responses[2]),
  };
};

const getQueryByTimeRange = (start: Date, end: Date, ruleId: string, type?: AlertTypes) => {
  let filter: QueryDslQueryContainer[] = [
    {
      range: {
        [TIMESTAMP]: {
          gte: start.toISOString(),
          lte: end.toISOString(),
        },
      },
    },
    {
      term: {
        [ALERT_RULE_UUID]: ruleId,
      },
    },
  ];
  if (type === AlertTypes.NEW) {
    filter.push({
      range: {
        [ALERT_START]: {
          gte: start.toISOString(),
        },
      },
    });
  } else if (type === AlertTypes.ONGOING) {
    filter = [
      ...filter,
      {
        range: {
          [ALERT_START]: {
            lt: start.toISOString(),
          },
        },
      },
      {
        bool: {
          must_not: {
            exists: {
              field: ALERT_END,
            },
          },
        },
      },
    ];
  } else if (type === AlertTypes.RECOVERED) {
    filter.push({
      range: {
        [ALERT_END]: {
          gte: start.toISOString(),
          lte: end.toISOString(),
        },
      },
    });
  }

  return {
    body: {
      size: MAX_ALERT_DOCS_TO_RETURN,
      track_total_hits: true,
      query: {
        bool: {
          filter,
        },
      },
    },
  };
};
