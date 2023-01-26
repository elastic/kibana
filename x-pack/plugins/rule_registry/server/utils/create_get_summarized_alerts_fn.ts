/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { merge } from 'lodash';
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
  ALERT_INSTANCE_ID,
} from '@kbn/rule-data-utils';
import {
  QueryDslQueryContainer,
  SearchTotalHits,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ParsedTechnicalFields } from '../../common';
import { ParsedExperimentalFields } from '../../common/parse_experimental_fields';
import { IRuleDataClient, IRuleDataReader } from '../rule_data_client';

const MAX_ALERT_DOCS_TO_RETURN = 100;
type AlertDocument = Partial<ParsedTechnicalFields & ParsedExperimentalFields>;

interface CreateGetSummarizedAlertsFnOpts {
  ruleDataClient: PublicContract<IRuleDataClient>;
  useNamespace: boolean;
  isLifecycleAlert: boolean;
}

export const createGetSummarizedAlertsFn =
  (opts: CreateGetSummarizedAlertsFnOpts) =>
  () =>
  async ({
    start,
    end,
    executionUuid,
    ruleId,
    spaceId,
    excludedAlertInstanceIds,
  }: GetSummarizedAlertsFnOpts) => {
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
        excludedAlertInstanceIds,
      });
    }

    return await getAlertsByTimeRange({
      ruleDataClientReader,
      ruleId,
      start: start!,
      end: end!,
      isLifecycleAlert: opts.isLifecycleAlert,
      excludedAlertInstanceIds,
    });
  };

interface GetAlertsByExecutionUuidOpts {
  executionUuid: string;
  ruleId: string;
  ruleDataClientReader: IRuleDataReader;
  isLifecycleAlert: boolean;
  excludedAlertInstanceIds: string[];
}

const getAlertsByExecutionUuid = async ({
  executionUuid,
  ruleId,
  ruleDataClientReader,
  isLifecycleAlert,
  excludedAlertInstanceIds,
}: GetAlertsByExecutionUuidOpts) => {
  if (isLifecycleAlert) {
    return getLifecycleAlertsByExecutionUuid({
      executionUuid,
      ruleId,
      ruleDataClientReader,
      excludedAlertInstanceIds,
    });
  }

  return getPersistentAlertsByExecutionUuid({
    executionUuid,
    ruleId,
    ruleDataClientReader,
    excludedAlertInstanceIds,
  });
};

interface GetAlertsByExecutionUuidHelperOpts {
  executionUuid: string;
  ruleId: string;
  ruleDataClientReader: IRuleDataReader;
  excludedAlertInstanceIds: string[];
}

const getPersistentAlertsByExecutionUuid = async <TSearchRequest extends ESSearchRequest>({
  executionUuid,
  ruleId,
  ruleDataClientReader,
  excludedAlertInstanceIds,
}: GetAlertsByExecutionUuidHelperOpts) => {
  // persistent alerts only create new alerts so query by execution UUID to
  // get all alerts created during an execution
  const request = getQueryByExecutionUuid(executionUuid, ruleId, excludedAlertInstanceIds);
  const response = (await ruleDataClientReader.search(request)) as ESSearchResponse<
    AlertDocument,
    TSearchRequest
  >;

  return {
    new: getHitsWithCount(response),
    ongoing: {
      count: 0,
      data: [],
    },
    recovered: {
      count: 0,
      data: [],
    },
  };
};

const getLifecycleAlertsByExecutionUuid = async ({
  executionUuid,
  ruleId,
  ruleDataClientReader,
  excludedAlertInstanceIds,
}: GetAlertsByExecutionUuidHelperOpts) => {
  // lifecycle alerts assign a different action to an alert depending
  // on whether it is new/ongoing/recovered. query for each action in order
  // to get the count of each action type as well as up to the maximum number
  // of each type of alert.
  const requests = [
    getQueryByExecutionUuid(executionUuid, ruleId, excludedAlertInstanceIds, 'open'),
    getQueryByExecutionUuid(executionUuid, ruleId, excludedAlertInstanceIds, 'active'),
    getQueryByExecutionUuid(executionUuid, ruleId, excludedAlertInstanceIds, 'close'),
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

const expandDottedField = (dottedFieldName: string, val: unknown): object => {
  const parts = dottedFieldName.split('.');
  if (parts.length === 1) {
    return { [parts[0]]: val };
  } else {
    return { [parts[0]]: expandDottedField(parts.slice(1).join('.'), val) };
  }
};

const expandFlattenedAlert = (alert: object) => {
  return Object.entries(alert).reduce(
    (acc, [key, val]) => merge(acc, expandDottedField(key, val)),
    {}
  );
};

const getHitsWithCount = <TSearchRequest extends ESSearchRequest>(
  response: ESSearchResponse<AlertDocument, TSearchRequest>
) => {
  return {
    count: (response.hits.total as SearchTotalHits).value,
    data: response.hits.hits.map((hit) => {
      const { _id, _index, _source } = hit;

      const rawAlert = {
        _id,
        _index,
        ..._source,
      };

      return expandFlattenedAlert(rawAlert as object);
    }),
  };
};

const getQueryByExecutionUuid = (
  executionUuid: string,
  ruleId: string,
  excludedAlertInstanceIds: string[],
  action?: string
) => {
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
  if (excludedAlertInstanceIds.length) {
    filter.push({
      bool: {
        must_not: {
          terms: {
            [ALERT_INSTANCE_ID]: excludedAlertInstanceIds,
          },
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

interface GetAlertsByTimeRangeOpts {
  start: Date;
  end: Date;
  ruleId: string;
  ruleDataClientReader: IRuleDataReader;
  isLifecycleAlert: boolean;
  excludedAlertInstanceIds: string[];
}

const getAlertsByTimeRange = async ({
  start,
  end,
  ruleId,
  ruleDataClientReader,
  isLifecycleAlert,
  excludedAlertInstanceIds,
}: GetAlertsByTimeRangeOpts) => {
  if (isLifecycleAlert) {
    return getLifecycleAlertsByTimeRange({
      start,
      end,
      ruleId,
      ruleDataClientReader,
      excludedAlertInstanceIds,
    });
  }

  return getPersistentAlertsByTimeRange({
    start,
    end,
    ruleId,
    ruleDataClientReader,
    excludedAlertInstanceIds,
  });
};

interface GetAlertsByTimeRangeHelperOpts {
  start: Date;
  end: Date;
  ruleId: string;
  ruleDataClientReader: IRuleDataReader;
  excludedAlertInstanceIds: string[];
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
  excludedAlertInstanceIds,
}: GetAlertsByTimeRangeHelperOpts) => {
  // persistent alerts only create new alerts so query for all alerts within the time
  // range and treat them as NEW
  const request = getQueryByTimeRange(start, end, ruleId, excludedAlertInstanceIds);
  const response = (await ruleDataClientReader.search(request)) as ESSearchResponse<
    AlertDocument,
    TSearchRequest
  >;

  return {
    new: getHitsWithCount(response),
    ongoing: {
      count: 0,
      data: [],
    },
    recovered: {
      count: 0,
      data: [],
    },
  };
};

const getLifecycleAlertsByTimeRange = async ({
  start,
  end,
  ruleId,
  ruleDataClientReader,
  excludedAlertInstanceIds,
}: GetAlertsByTimeRangeHelperOpts) => {
  const requests = [
    getQueryByTimeRange(start, end, ruleId, excludedAlertInstanceIds, AlertTypes.NEW),
    getQueryByTimeRange(start, end, ruleId, excludedAlertInstanceIds, AlertTypes.ONGOING),
    getQueryByTimeRange(start, end, ruleId, excludedAlertInstanceIds, AlertTypes.RECOVERED),
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

const getQueryByTimeRange = (
  start: Date,
  end: Date,
  ruleId: string,
  excludedAlertInstanceIds: string[],
  type?: AlertTypes
) => {
  // base query filters the alert documents for a rule by the given time range
  let filter: QueryDslQueryContainer[] = [
    {
      range: {
        [TIMESTAMP]: {
          gte: start.toISOString(),
          lt: end.toISOString(),
        },
      },
    },
    {
      term: {
        [ALERT_RULE_UUID]: ruleId,
      },
    },
  ];

  if (excludedAlertInstanceIds.length) {
    filter.push({
      bool: {
        must_not: {
          terms: {
            [ALERT_INSTANCE_ID]: excludedAlertInstanceIds,
          },
        },
      },
    });
  }

  if (type === AlertTypes.NEW) {
    // alerts are considered NEW within the time range if they started after
    // the query start time
    filter.push({
      range: {
        [ALERT_START]: {
          gte: start.toISOString(),
        },
      },
    });
  } else if (type === AlertTypes.ONGOING) {
    // alerts are considered ONGOING within the time range if they started
    // before the query start time and they have not been recovered (no end time)
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
    // alerts are considered RECOVERED within the time range if they recovered
    // within the query time range
    filter.push({
      range: {
        [ALERT_END]: {
          gte: start.toISOString(),
          lt: end.toISOString(),
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
