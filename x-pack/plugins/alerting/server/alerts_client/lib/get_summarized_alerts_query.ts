/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  QueryDslQueryContainer,
  SearchRequest,
  SearchTotalHits,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { merge } from 'lodash';
import {
  ALERT_END,
  ALERT_INSTANCE_ID,
  ALERT_MAINTENANCE_WINDOW_IDS,
  ALERT_RULE_EXECUTION_UUID,
  ALERT_RULE_UUID,
  ALERT_START,
  EVENT_ACTION,
  TIMESTAMP,
} from '@kbn/rule-data-utils';
import { Alert } from '@kbn/alerts-as-data-utils';
import { AlertsFilter, ISO_WEEKDAYS, RuleAlertData } from '../../../common';
import {
  GetLifecycleAlertsQueryByExecutionUuidParams,
  GetLifecycleAlertsQueryByTimeRangeParams,
  GetAlertsQueryParams,
  GetQueryByExecutionUuidParams,
  GetQueryByTimeRangeParams,
  SearchResult,
} from '../types';
import { SummarizedAlertsChunk } from '../..';
import { FormatAlert } from '../../types';

const MAX_ALERT_DOCS_TO_RETURN = 100;
enum AlertTypes {
  NEW = 0,
  ONGOING,
  RECOVERED,
}

const getLifecycleAlertsQueryByExecutionUuid = ({
  executionUuid,
  ruleId,
  excludedAlertInstanceIds,
  alertsFilter,
}: GetLifecycleAlertsQueryByExecutionUuidParams): Array<SearchRequest['body']> => {
  // lifecycle alerts assign a different action to an alert depending
  // on whether it is new/ongoing/recovered. query for each action in order
  // to get the count of each action type as well as up to the maximum number
  // of each type of alert.
  return [
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
};

const getLifecycleAlertsQueryByTimeRange = ({
  start,
  end,
  ruleId,
  excludedAlertInstanceIds,
  alertsFilter,
}: GetLifecycleAlertsQueryByTimeRangeParams): Array<SearchRequest['body']> => {
  return [
    getQueryByTimeRange({
      start,
      end,
      ruleId,
      excludedAlertInstanceIds,
      type: AlertTypes.NEW,
      alertsFilter,
    }),
    getQueryByTimeRange({
      start,
      end,
      ruleId,
      excludedAlertInstanceIds,
      type: AlertTypes.ONGOING,
      alertsFilter,
    }),
    getQueryByTimeRange({
      start,
      end,
      ruleId,
      excludedAlertInstanceIds,
      type: AlertTypes.RECOVERED,
      alertsFilter,
    }),
  ];
};

const getQueryByExecutionUuid = ({
  executionUuid,
  ruleId,
  excludedAlertInstanceIds,
  action,
  alertsFilter,
}: GetQueryByExecutionUuidParams): SearchRequest['body'] => {
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
    size: MAX_ALERT_DOCS_TO_RETURN,
    track_total_hits: true,
    query: {
      bool: {
        filter,
      },
    },
  };
};

const getQueryByTimeRange = ({
  start,
  end,
  ruleId,
  excludedAlertInstanceIds,
  type,
  alertsFilter,
}: GetQueryByTimeRangeParams<AlertTypes>): SearchRequest['body'] => {
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
    size: MAX_ALERT_DOCS_TO_RETURN,
    track_total_hits: true,
    query: {
      bool: {
        filter,
      },
    },
  };
};

const expandFlattenedAlert = (alert: object) => {
  return Object.entries(alert).reduce(
    (acc, [key, val]) => merge(acc, expandDottedField(key, val)),
    {}
  );
};
const expandDottedField = (dottedFieldName: string, val: unknown): object => {
  const parts = dottedFieldName.split('.');
  if (parts.length === 1) {
    return { [parts[0]]: val };
  } else {
    return { [parts[0]]: expandDottedField(parts.slice(1).join('.'), val) };
  }
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

const getHitsWithCount = <AlertData extends RuleAlertData>(
  response: SearchResult<AlertData>,
  formatAlert?: FormatAlert<AlertData>
): SummarizedAlertsChunk => {
  return {
    count: (response.total as SearchTotalHits).value,
    data: response.hits.map((hit) => {
      const { _id, _index, _source } = hit;

      const formattedSource = formatAlert && _source ? formatAlert(_source) : _source;

      const expandedSource = expandFlattenedAlert(formattedSource as object) as Alert & AlertData;
      return {
        _id,
        _index,
        ...expandedSource,
      };
    }),
  };
};

const getLifecycleAlertsQueries = ({
  executionUuid,
  start,
  end,
  ruleId,
  excludedAlertInstanceIds,
  alertsFilter,
}: GetAlertsQueryParams): Array<SearchRequest['body']> => {
  let queryBodies;
  if (!!executionUuid) {
    queryBodies = getLifecycleAlertsQueryByExecutionUuid({
      executionUuid: executionUuid!,
      ruleId,
      excludedAlertInstanceIds,
      alertsFilter,
    });
  } else {
    queryBodies = getLifecycleAlertsQueryByTimeRange({
      start: start!,
      end: end!,
      ruleId,
      excludedAlertInstanceIds,
      alertsFilter,
    });
  }

  return queryBodies;
};

const getContinualAlertsQuery = ({
  executionUuid,
  start,
  end,
  ruleId,
  excludedAlertInstanceIds,
  alertsFilter,
}: GetAlertsQueryParams): SearchRequest['body'] => {
  let queryBody;
  if (!!executionUuid) {
    queryBody = getQueryByExecutionUuid({
      executionUuid,
      ruleId,
      excludedAlertInstanceIds,
      alertsFilter,
    });
  } else {
    queryBody = getQueryByTimeRange({
      start: start!,
      end: end!,
      ruleId,
      excludedAlertInstanceIds,
      alertsFilter,
    });
  }

  return queryBody;
};

export {
  getHitsWithCount,
  expandFlattenedAlert,
  getLifecycleAlertsQueries,
  getContinualAlertsQuery,
};
