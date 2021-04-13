/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { estypes } from '@elastic/elasticsearch';
import { RegisterAlertTypesParams } from '..';
import { createLifecycleRuleType } from '../../types';
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
    createLifecycleRuleType({
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
          services: { alertInstanceFactory, logger, scopedClusterClient },
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
          `alert ${EsQuery.ID}:${rule.id} "${rule.name}" query - ${JSON.stringify(query)}`
        );

        const { body: searchResult } = await esClient.search(query);

        if (searchResult.hits.hits.length > 0) {
          const numMatches = (searchResult.hits.total as estypes.TotalHits).value;
          logger.debug(
            `alert ${EsQuery.ID}:${rule.id} "${rule.name}" query has ${numMatches} matches`
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
            const alertInstance = alertInstanceFactory(EsQuery.ConditionMetAlertInstanceId);
            alertInstance
              // store the params we would need to recreate the query that led to this alert instance
              .replaceState({ latestTimestamp: timestamp, dateStart, dateEnd })
              .scheduleActions(EsQuery.RuleTypeActionGroupId, actionContext);

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
