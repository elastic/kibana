/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { merge } from 'lodash';
import type { PublicContract } from '@kbn/utility-types';
import { ESSearchRequest, ESSearchResponse } from '@kbn/es-types';
import type { SummarizedAlertsChunk, GetSummarizedAlertsFnOpts } from '@kbn/alerting-plugin/server';
import {
  ALERT_END,
  ALERT_RULE_EXECUTION_UUID,
  ALERT_RULE_UUID,
  ALERT_START,
  EVENT_ACTION,
  TIMESTAMP,
  ALERT_INSTANCE_ID,
  ALERT_MAINTENANCE_WINDOW_IDS,
} from '@kbn/rule-data-utils';
import {
  QueryDslQueryContainer,
  SearchTotalHits,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { AlertsFilter, ISO_WEEKDAYS } from '@kbn/alerting-plugin/common';
import { AlertHit, SummarizedAlerts } from '@kbn/alerting-plugin/server/types';
import { ParsedTechnicalFields } from '../../common';
import { ParsedExperimentalFields } from '../../common/parse_experimental_fields';
import { IRuleDataClient, IRuleDataReader } from '../rule_data_client';

const MAX_ALERT_DOCS_TO_RETURN = 100;

export type AlertDocument = Partial<ParsedTechnicalFields & ParsedExperimentalFields>;

interface CreateGetSummarizedAlertsFnOpts {
  ruleDataClient: PublicContract<IRuleDataClient>;
  useNamespace: boolean;
  isLifecycleAlert: boolean;
  formatAlert?: (alert: AlertDocument) => AlertDocument;
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
    alertsFilter,
  }: GetSummarizedAlertsFnOpts): Promise<SummarizedAlerts> => {
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
        formatAlert: opts.formatAlert,
        excludedAlertInstanceIds,
        alertsFilter,
      });
    }
    return await getAlertsByTimeRange({
      ruleDataClientReader,
      ruleId,
      start: start!,
      end: end!,
      isLifecycleAlert: opts.isLifecycleAlert,
      formatAlert: opts.formatAlert,
      excludedAlertInstanceIds,
      alertsFilter,
    });
  };

interface GetAlertsByExecutionUuidOpts {
  executionUuid: string;
  ruleId: string;
  ruleDataClientReader: IRuleDataReader;
  isLifecycleAlert: boolean;
  excludedAlertInstanceIds: string[];
  formatAlert?: (alert: AlertDocument) => AlertDocument;
  alertsFilter?: AlertsFilter | null;
}

const getAlertsByExecutionUuid = async ({
  executionUuid,
  ruleId,
  ruleDataClientReader,
  isLifecycleAlert,
  excludedAlertInstanceIds,
  formatAlert,
  alertsFilter,
}: GetAlertsByExecutionUuidOpts): Promise<SummarizedAlerts> => {
  if (isLifecycleAlert) {
    return getLifecycleAlertsByExecutionUuid({
      executionUuid,
      ruleId,
      ruleDataClientReader,
      formatAlert,
      excludedAlertInstanceIds,
      alertsFilter,
    });
  }

  return getPersistentAlertsByExecutionUuid({
    executionUuid,
    ruleId,
    ruleDataClientReader,
    formatAlert,
    excludedAlertInstanceIds,
    alertsFilter,
  });
};

interface GetAlertsByExecutionUuidHelperOpts {
  executionUuid: string;
  ruleId: string;
  ruleDataClientReader: IRuleDataReader;
  excludedAlertInstanceIds: string[];
  formatAlert?: (alert: AlertDocument) => AlertDocument;
  alertsFilter?: AlertsFilter | null;
}

const getPersistentAlertsByExecutionUuid = async <TSearchRequest extends ESSearchRequest>({
  executionUuid,
  ruleId,
  ruleDataClientReader,
  excludedAlertInstanceIds,
  formatAlert,
  alertsFilter,
}: GetAlertsByExecutionUuidHelperOpts): Promise<SummarizedAlerts> => {
  // persistent alerts only create new alerts so query by execution UUID to
  // get all alerts created during an execution
  const request = getQueryByExecutionUuid({
    executionUuid,
    ruleId,
    excludedAlertInstanceIds,
    alertsFilter,
  });
  const response = await doSearch(ruleDataClientReader, request, formatAlert);

  return {
    new: response,
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
  formatAlert,
  alertsFilter,
}: GetAlertsByExecutionUuidHelperOpts): Promise<SummarizedAlerts> => {
  // lifecycle alerts assign a different action to an alert depending
  // on whether it is new/ongoing/recovered. query for each action in order
  // to get the count of each action type as well as up to the maximum number
  // of each type of alert.
  const requests = [
    getQueryByExecutionUuid({
      executionUuid,
      ruleId,
      excludedAlertInstanceIds,
      action: 'open',
      alertsFilter,
    }),
    getQueryByExecutionUuid({
      executionUuid,
      ruleId,
      excludedAlertInstanceIds,
      action: 'active',
      alertsFilter,
    }),
    getQueryByExecutionUuid({
      executionUuid,
      ruleId,
      excludedAlertInstanceIds,
      action: 'close',
      alertsFilter,
    }),
  ];

  const responses = await Promise.all(
    requests.map((request) => doSearch(ruleDataClientReader, request, formatAlert))
  );

  return {
    new: responses[0],
    ongoing: responses[1],
    recovered: responses[2],
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
  response: ESSearchResponse<AlertHit, TSearchRequest>,
  formatAlert?: (alert: AlertDocument) => AlertDocument
): SummarizedAlertsChunk => {
  return {
    count: (response.hits.total as SearchTotalHits).value,
    data: response.hits.hits.map((hit) => {
      const { _id, _index, _source } = hit;

      const formattedSource = formatAlert ? formatAlert(_source) : _source;

      const expandedSource = expandFlattenedAlert(formattedSource as object);
      return {
        _id,
        _index,
        ...expandedSource,
      } as AlertHit;
    }),
  };
};

const doSearch = async (
  ruleDataClientReader: IRuleDataReader,
  request: ESSearchRequest,
  formatAlert?: (alert: AlertDocument) => AlertDocument
): Promise<SummarizedAlertsChunk> => {
  const response = await ruleDataClientReader.search(request);
  return getHitsWithCount(response as ESSearchResponse<AlertHit>, formatAlert);
};

interface GetQueryByExecutionUuidParams {
  executionUuid: string;
  ruleId: string;
  excludedAlertInstanceIds: string[];
  action?: string;
  alertsFilter?: AlertsFilter | null;
}

const getQueryByExecutionUuid = ({
  executionUuid,
  ruleId,
  excludedAlertInstanceIds,
  action,
  alertsFilter,
}: GetQueryByExecutionUuidParams) => {
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
    {
      bool: {
        must_not: {
          exists: {
            field: ALERT_MAINTENANCE_WINDOW_IDS,
          },
        },
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

  if (alertsFilter) {
    filter.push(...generateAlertsFilterDSL(alertsFilter));
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
  formatAlert?: (alert: AlertDocument) => AlertDocument;
  alertsFilter?: AlertsFilter | null;
}

const getAlertsByTimeRange = async ({
  start,
  end,
  ruleId,
  ruleDataClientReader,
  isLifecycleAlert,
  excludedAlertInstanceIds,
  formatAlert,
  alertsFilter,
}: GetAlertsByTimeRangeOpts): Promise<SummarizedAlerts> => {
  if (isLifecycleAlert) {
    return getLifecycleAlertsByTimeRange({
      start,
      end,
      ruleId,
      ruleDataClientReader,
      formatAlert,
      excludedAlertInstanceIds,
      alertsFilter,
    });
  }
  return getPersistentAlertsByTimeRange({
    start,
    end,
    ruleId,
    ruleDataClientReader,
    formatAlert,
    excludedAlertInstanceIds,
    alertsFilter,
  });
};

interface GetAlertsByTimeRangeHelperOpts {
  start: Date;
  end: Date;
  ruleId: string;
  ruleDataClientReader: IRuleDataReader;
  formatAlert?: (alert: AlertDocument) => AlertDocument;
  excludedAlertInstanceIds: string[];
  alertsFilter?: AlertsFilter | null;
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
  formatAlert,
  excludedAlertInstanceIds,
  alertsFilter,
}: GetAlertsByTimeRangeHelperOpts) => {
  // persistent alerts only create new alerts so query for all alerts within the time
  // range and treat them as NEW
  const request = getQueryByTimeRange(
    start,
    end,
    ruleId,
    excludedAlertInstanceIds,
    undefined,
    alertsFilter
  );
  const response = await doSearch(ruleDataClientReader, request, formatAlert);

  return {
    new: response,
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
  formatAlert,
  excludedAlertInstanceIds,
  alertsFilter,
}: GetAlertsByTimeRangeHelperOpts): Promise<SummarizedAlerts> => {
  const requests = [
    getQueryByTimeRange(start, end, ruleId, excludedAlertInstanceIds, AlertTypes.NEW, alertsFilter),
    getQueryByTimeRange(
      start,
      end,
      ruleId,
      excludedAlertInstanceIds,
      AlertTypes.ONGOING,
      alertsFilter
    ),
    getQueryByTimeRange(
      start,
      end,
      ruleId,
      excludedAlertInstanceIds,
      AlertTypes.RECOVERED,
      alertsFilter
    ),
  ];

  const responses = await Promise.all(
    requests.map((request) => doSearch(ruleDataClientReader, request, formatAlert))
  );

  return {
    new: responses[0],
    ongoing: responses[1],
    recovered: responses[2],
  };
};

const getQueryByTimeRange = (
  start: Date,
  end: Date,
  ruleId: string,
  excludedAlertInstanceIds: string[],
  type?: AlertTypes,
  alertsFilter?: AlertsFilter | null
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

  if (alertsFilter) {
    filter.push(...generateAlertsFilterDSL(alertsFilter));
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

const generateAlertsFilterDSL = (alertsFilter: AlertsFilter): QueryDslQueryContainer[] => {
  const filter: QueryDslQueryContainer[] = [];

  if (alertsFilter.query) {
    filter.push(JSON.parse(alertsFilter.query.dsl!));
  }
  if (alertsFilter.timeframe) {
    filter.push(
      {
        script: {
          script: {
            source:
              'params.days.contains(doc[params.datetimeField].value.withZoneSameInstant(ZoneId.of(params.timezone)).dayOfWeek.getValue())',
            params: {
              days:
                alertsFilter.timeframe.days.length === 0
                  ? ISO_WEEKDAYS
                  : alertsFilter.timeframe.days,
              timezone: alertsFilter.timeframe.timezone,
              datetimeField: TIMESTAMP,
            },
          },
        },
      },
      {
        script: {
          script: {
            source: `
              def alertsDateTime = doc[params.datetimeField].value.withZoneSameInstant(ZoneId.of(params.timezone));
              def alertsTime = LocalTime.of(alertsDateTime.getHour(), alertsDateTime.getMinute());
              def start = LocalTime.parse(params.start);
              def end = LocalTime.parse(params.end);

              if (end.isBefore(start) || end.equals(start)){ // overnight
                def dayEnd = LocalTime.parse("23:59:59");
                def dayStart = LocalTime.parse("00:00:00");
                if ((alertsTime.isAfter(start) && alertsTime.isBefore(dayEnd)) || (alertsTime.isAfter(dayStart) && alertsTime.isBefore(end))) {
                  return true;
                } else {
                  return false;
                }
              } else {
                if (alertsTime.isAfter(start) && alertsTime.isBefore(end)) {
                    return true;
                } else {
                    return false;
                }
              }
           `,
            params: {
              start: alertsFilter.timeframe.hours.start,
              end: alertsFilter.timeframe.hours.end,
              timezone: alertsFilter.timeframe.timezone,
              datetimeField: TIMESTAMP,
            },
          },
        },
      }
    );
  }
  return filter;
};
