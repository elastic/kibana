/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { Logger } from 'src/core/server';
import { ESSearchResponse } from '../../../../../typings/elasticsearch';
import { AlertType, AlertExecutorOptions } from '../../types';
import { ActionContext, EsQueryAlertActionContext, addMessages } from './action_context';
import {
  EsQueryAlertParams,
  EsQueryAlertParamsSchema,
  EsQueryAlertState,
} from './alert_type_params';
import { STACK_ALERTS_FEATURE_ID } from '../../../common';
import { ComparatorFns, getHumanReadableComparator } from '../lib';
import { parseDuration } from '../../../../alerting/server';
import { buildSortedEventsQuery } from '../../../common/build_sorted_events_query';
import { ESSearchHit } from '../../../../../typings/elasticsearch';

export const ES_QUERY_ID = '.es-query';

const ActionGroupId = 'query matched';
const ConditionMetAlertInstanceId = 'query matched';

export function getAlertType(
  logger: Logger
): AlertType<EsQueryAlertParams, EsQueryAlertState, {}, ActionContext, typeof ActionGroupId> {
  const alertTypeName = i18n.translate('xpack.stackAlerts.esQuery.alertTypeTitle', {
    defaultMessage: 'Elasticsearch query',
  });

  const actionGroupName = i18n.translate('xpack.stackAlerts.esQuery.actionGroupThresholdMetTitle', {
    defaultMessage: 'Query matched',
  });

  const actionVariableContextDateLabel = i18n.translate(
    'xpack.stackAlerts.esQuery.actionVariableContextDateLabel',
    {
      defaultMessage: 'The date that the alert met the threshold condition.',
    }
  );

  const actionVariableContextValueLabel = i18n.translate(
    'xpack.stackAlerts.esQuery.actionVariableContextValueLabel',
    {
      defaultMessage: 'The value that met the threshold condition.',
    }
  );

  const actionVariableContextHitsLabel = i18n.translate(
    'xpack.stackAlerts.esQuery.actionVariableContextHitsLabel',
    {
      defaultMessage: 'The documents that met the threshold condition.',
    }
  );

  const actionVariableContextMessageLabel = i18n.translate(
    'xpack.stackAlerts.esQuery.actionVariableContextMessageLabel',
    {
      defaultMessage: 'A message for the alert.',
    }
  );

  const actionVariableContextTitleLabel = i18n.translate(
    'xpack.stackAlerts.esQuery.actionVariableContextTitleLabel',
    {
      defaultMessage: 'A title for the alert.',
    }
  );

  const actionVariableContextIndexLabel = i18n.translate(
    'xpack.stackAlerts.esQuery.actionVariableContextIndexLabel',
    {
      defaultMessage: 'The index the query was run against.',
    }
  );

  const actionVariableContextQueryLabel = i18n.translate(
    'xpack.stackAlerts.esQuery.actionVariableContextQueryLabel',
    {
      defaultMessage: 'The string representation of the Elasticsearch query.',
    }
  );

  const actionVariableContextSizeLabel = i18n.translate(
    'xpack.stackAlerts.esQuery.actionVariableContextSizeLabel',
    {
      defaultMessage: 'The number of hits to retrieve for each query.',
    }
  );

  const actionVariableContextThresholdLabel = i18n.translate(
    'xpack.stackAlerts.esQuery.actionVariableContextThresholdLabel',
    {
      defaultMessage:
        "An array of values to use as the threshold; 'between' and 'notBetween' require two values, the others require one.",
    }
  );

  const actionVariableContextThresholdComparatorLabel = i18n.translate(
    'xpack.stackAlerts.esQuery.actionVariableContextThresholdComparatorLabel',
    {
      defaultMessage: 'A function to determine if the threshold has been met.',
    }
  );

  const actionVariableContextConditionsLabel = i18n.translate(
    'xpack.stackAlerts.esQuery.actionVariableContextConditionsLabel',
    {
      defaultMessage: 'A string that describes the threshold condition.',
    }
  );

  return {
    id: ES_QUERY_ID,
    name: alertTypeName,
    actionGroups: [{ id: ActionGroupId, name: actionGroupName }],
    defaultActionGroupId: ActionGroupId,
    validate: {
      params: EsQueryAlertParamsSchema,
    },
    actionVariables: {
      context: [
        { name: 'message', description: actionVariableContextMessageLabel },
        { name: 'title', description: actionVariableContextTitleLabel },
        { name: 'date', description: actionVariableContextDateLabel },
        { name: 'value', description: actionVariableContextValueLabel },
        { name: 'hits', description: actionVariableContextHitsLabel },
        { name: 'conditions', description: actionVariableContextConditionsLabel },
      ],
      params: [
        { name: 'index', description: actionVariableContextIndexLabel },
        { name: 'esQuery', description: actionVariableContextQueryLabel },
        { name: 'size', description: actionVariableContextSizeLabel },
        { name: 'threshold', description: actionVariableContextThresholdLabel },
        { name: 'thresholdComparator', description: actionVariableContextThresholdComparatorLabel },
      ],
    },
    minimumLicenseRequired: 'basic',
    executor,
    producer: STACK_ALERTS_FEATURE_ID,
  };

  async function executor(
    options: AlertExecutorOptions<
      EsQueryAlertParams,
      EsQueryAlertState,
      {},
      ActionContext,
      typeof ActionGroupId
    >
  ) {
    const { alertId, name, services, params, state } = options;
    const previousTimestamp = state.latestTimestamp;

    const callCluster = services.callCluster;
    const { parsedQuery, dateStart, dateEnd } = getSearchParams(params);

    const compareFn = ComparatorFns.get(params.thresholdComparator);
    if (compareFn == null) {
      throw new Error(getInvalidComparatorError(params.thresholdComparator));
    }

    // During each alert execution, we run the configured query, get a hit count
    // (hits.total) and retrieve up to params.size hits. We
    // evaluate the threshold condition using the value of hits.total. If the threshold
    // condition is met, the hits are counted toward the query match and we update
    // the alert state with the timestamp of the latest hit. In the next execution
    // of the alert, the latestTimestamp will be used to gate the query in order to
    // avoid counting a document multiple times.

    let timestamp: string | undefined = previousTimestamp;
    const filter = timestamp
      ? {
          bool: {
            filter: [
              parsedQuery.query,
              {
                bool: {
                  must_not: [
                    {
                      bool: {
                        filter: [
                          {
                            range: {
                              [params.timeField]: { lte: new Date(timestamp).toISOString() },
                            },
                          },
                        ],
                      },
                    },
                  ],
                },
              },
            ],
          },
        }
      : parsedQuery.query;

    const query = buildSortedEventsQuery({
      index: params.index,
      from: dateStart,
      to: dateEnd,
      filter,
      size: params.size,
      sortOrder: 'desc',
      searchAfterSortId: undefined,
      timeField: params.timeField,
      track_total_hits: true,
    });

    logger.debug(`alert ${ES_QUERY_ID}:${alertId} "${name}" query - ${JSON.stringify(query)}`);

    const searchResult: ESSearchResponse<unknown, {}> = await callCluster('search', query);

    if (searchResult.hits.hits.length > 0) {
      const numMatches = searchResult.hits.total.value;
      logger.debug(`alert ${ES_QUERY_ID}:${alertId} "${name}" query has ${numMatches} matches`);

      // apply the alert condition
      const conditionMet = compareFn(numMatches, params.threshold);

      if (conditionMet) {
        const humanFn = i18n.translate(
          'xpack.stackAlerts.esQuery.alertTypeContextConditionsDescription',
          {
            defaultMessage: `Number of matching documents is {thresholdComparator} {threshold}`,
            values: {
              thresholdComparator: getHumanReadableComparator(params.thresholdComparator),
              threshold: params.threshold.join(' and '),
            },
          }
        );

        const baseContext: EsQueryAlertActionContext = {
          date: new Date().toISOString(),
          value: numMatches,
          conditions: humanFn,
          hits: searchResult.hits.hits,
        };

        const actionContext = addMessages(options, baseContext, params);
        const alertInstance = options.services.alertInstanceFactory(ConditionMetAlertInstanceId);
        alertInstance
          // store the params we would need to recreate the query that led to this alert instance
          .replaceState({ latestTimestamp: timestamp, dateStart, dateEnd })
          .scheduleActions(ActionGroupId, actionContext);

        // update the timestamp based on the current search results
        const firstHitWithSort = searchResult.hits.hits.find(
          (hit: ESSearchHit) => hit.sort != null
        );
        const lastTimestamp = firstHitWithSort?.sort;
        if (lastTimestamp != null && lastTimestamp.length > 0) {
          timestamp = lastTimestamp[0];
        }
      }
    }

    return {
      latestTimestamp: timestamp,
    };
  }
}

function getInvalidComparatorError(comparator: string) {
  return i18n.translate('xpack.stackAlerts.esQuery.invalidComparatorErrorMessage', {
    defaultMessage: 'invalid thresholdComparator specified: {comparator}',
    values: {
      comparator,
    },
  });
}

function getInvalidWindowSizeError(windowValue: string) {
  return i18n.translate('xpack.stackAlerts.esQuery.invalidWindowSizeErrorMessage', {
    defaultMessage: 'invalid format for windowSize: "{windowValue}"',
    values: {
      windowValue,
    },
  });
}

function getInvalidQueryError(query: string) {
  return i18n.translate('xpack.stackAlerts.esQuery.invalidQueryErrorMessage', {
    defaultMessage: 'invalid query specified: "{query}" - query must be JSON',
    values: {
      query,
    },
  });
}

function getSearchParams(queryParams: EsQueryAlertParams) {
  const date = Date.now();
  const { esQuery, timeWindowSize, timeWindowUnit } = queryParams;

  let parsedQuery;
  try {
    parsedQuery = JSON.parse(esQuery);
  } catch (err) {
    throw new Error(getInvalidQueryError(esQuery));
  }

  if (parsedQuery && !parsedQuery.query) {
    throw new Error(getInvalidQueryError(esQuery));
  }

  const window = `${timeWindowSize}${timeWindowUnit}`;
  let timeWindow: number;
  try {
    timeWindow = parseDuration(window);
  } catch (err) {
    throw new Error(getInvalidWindowSizeError(window));
  }

  const dateStart = new Date(date - timeWindow).toISOString();
  const dateEnd = new Date(date).toISOString();

  return { parsedQuery, dateStart, dateEnd };
}
