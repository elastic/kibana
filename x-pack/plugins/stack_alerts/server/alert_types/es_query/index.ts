/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { estypes } from '@elastic/elasticsearch';
import { RegisterAlertTypesParams } from '..';
import { createThresholdRuleType } from '../../types';
import { STACK_ALERTS_FEATURE_ID } from '../../../common';
import { ComparatorFns, getHumanReadableComparator } from '../lib';
import * as EsQuery from './alert_type';
import {
  getSearchParams,
  getInvalidComparatorError,
  getValidTimefieldSort,
  tryToParseAsDate,
} from './alert_type';
import { EsQueryAlertActionContext, addMessages } from './action_context';
import { EsQueryAlertParamsSchema } from './alert_type_params';
import { buildSortedEventsQuery } from '../../../common/build_sorted_events_query';

export function register(registerParams: RegisterAlertTypesParams) {
  const { registry } = registerParams;
  registry.registerType(
    createThresholdRuleType({
      id: EsQuery.ID,
      name: EsQuery.RuleTypeName,
      actionGroups: [{ id: EsQuery.RuleTypeActionGroupId, name: EsQuery.RuleTypeActionGroupName }],
      defaultActionGroupId: EsQuery.RuleTypeActionGroupId,
      validate: {
        params: EsQueryAlertParamsSchema,
      },
      actionVariables: {
        context: [
          { name: 'message', description: EsQuery.actionVariableContextMessageLabel },
          { name: 'title', description: EsQuery.actionVariableContextTitleLabel },
          { name: 'date', description: EsQuery.actionVariableContextDateLabel },
          { name: 'value', description: EsQuery.actionVariableContextValueLabel },
          { name: 'hits', description: EsQuery.actionVariableContextHitsLabel },
          { name: 'conditions', description: EsQuery.actionVariableContextConditionsLabel },
        ],
        params: [
          { name: 'index', description: EsQuery.actionVariableContextIndexLabel },
          { name: 'esQuery', description: EsQuery.actionVariableContextQueryLabel },
          { name: 'size', description: EsQuery.actionVariableContextSizeLabel },
          { name: 'threshold', description: EsQuery.actionVariableContextThresholdLabel },
          {
            name: 'thresholdComparator',
            description: EsQuery.actionVariableContextThresholdComparatorLabel,
          },
        ],
      },
      minimumLicenseRequired: 'basic',
      executor: async (options) => {
        const {
          rule,
          params,
          state,
          services: {
            writeRuleAlert,
            writeRuleMetric,
            writeRuleEvents,
            logger,
            scopedClusterClient,
          },
        } = options;
        const previousTimestamp =
          state && state.latestTimestamp ? (state.latestTimestamp as string) : undefined;

        const esClient = scopedClusterClient.asCurrentUser;
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

        let timestamp: string | undefined = tryToParseAsDate(previousTimestamp);
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
                                  [params.timeField]: { lte: timestamp },
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

        logger.debug(
          `alert ${EsQuery.ID}:${rule.uuid} "${rule.name}" query - ${JSON.stringify(query)}`
        );

        const { body: searchResult } = await esClient.search(query);
        const numMatches =
          searchResult.hits.hits.length > 0
            ? (searchResult.hits.total as estypes.TotalHits).value
            : 0;

        // According to the issue description for https://github.com/elastic/kibana/issues/93728
        // This would be considered "extra documents [which] are typically immutable and provide
        // extra details for the Alert"
        // This will show up in the alerts-as-data index as event.kind: "metric"
        writeRuleMetric({
          id: EsQuery.ConditionMetAlertInstanceId,
          fields: {
            'kibana.rac.alert.value': numMatches,
            'kibana.rac.alert.threshold': params.threshold[0],
          },
        });

        if (numMatches > 0) {
          logger.debug(
            `alert ${EsQuery.ID}:${rule.uuid} "${rule.name}" query has ${numMatches} matches`
          );

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

            const actionContext = addMessages(rule.name, baseContext, params);
            writeRuleAlert({
              id: EsQuery.ConditionMetAlertInstanceId,
              fields: {
                'kibana.rac.alert.value': numMatches,
                'kibana.rac.alert.threshold': params.threshold[0],
              },
            })
              // store the params we would need to recreate the query that led to this alert instance
              .replaceState({ latestTimestamp: timestamp, dateStart, dateEnd })
              .scheduleActions(EsQuery.RuleTypeActionGroupId, actionContext);

            // This will show up in the alerts-as-data index as event.kind: "event"
            // and contain a copy of the source document, with basic alerts-as-data fields appended
            writeRuleEvents({
              events: searchResult.hits.hits,
              id: EsQuery.ConditionMetAlertInstanceId,
              fields: {},
            });

            // update the timestamp based on the current search results
            const firstValidTimefieldSort = getValidTimefieldSort(
              searchResult.hits.hits.find((hit) => getValidTimefieldSort(hit.sort))?.sort
            );
            if (firstValidTimefieldSort) {
              timestamp = firstValidTimefieldSort;
            }
          }
        }

        return {
          latestTimestamp: timestamp,
        };
      },
      producer: STACK_ALERTS_FEATURE_ID,
    })
  );
}
