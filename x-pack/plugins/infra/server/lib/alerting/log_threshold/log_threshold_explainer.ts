/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EsQueryExplanation } from '@kbn/alerting-plugin/common/rule';
import {
  RuleParams,
  ruleParamsRT,
  getDenominator,
  getNumerator,
  isRatioRuleParams,
} from '../../../../common/alerting/logs/log_threshold';
import { InfraBackendLibs } from '../../infra_types';
import { decodeOrThrow } from '../../../../common/runtime_types';
import { getESQuery } from './log_threshold_executor';

// Takes a set of alert params and generates an explanation,
// in the Log Threshold case this is an ES Query.
export const createLogThresholdExplanationFunction =
  (libs: InfraBackendLibs) =>
  async (ruleParams: RuleParams, scopedEsClusterClient, savedObjectsClient) => {
    console.log('Inside the explain function');
    const [, , { logViews }] = await libs.getStartServices();
    const { indices, timestampField, runtimeMappings } = await logViews
      .getClient(savedObjectsClient, scopedEsClusterClient.asCurrentUser)
      .getResolvedLogView('default'); // TODO: move to params

    try {
      const validatedParams = decodeOrThrow(ruleParamsRT)(ruleParams);
      const fakeExecutionTimestamp = Date.now(); // NOTE: This would normally be the startedAt value handed from the Alerting Framework to the Executor

      const queries = [];

      if (!isRatioRuleParams(validatedParams)) {
        const query = getESQuery(
          validatedParams,
          timestampField,
          indices,
          runtimeMappings,
          fakeExecutionTimestamp
        );

        queries.push({
          annotation: 'Elasticsearch query', // TODO: i18n
          query: JSON.stringify(query),
        });
      } else {
        // Ratio alert params are separated out into two standard sets of alert params
        // TODO: There is some crossover here with the splitting out in the executor, could be combined in to a shared function.
        const numeratorParams: RuleParams = {
          ...validatedParams,
          criteria: getNumerator(validatedParams.criteria),
        };

        const denominatorParams: RuleParams = {
          ...validatedParams,
          criteria: getDenominator(validatedParams.criteria),
        };

        const numeratorQuery = getESQuery(
          numeratorParams,
          timestampField,
          indices,
          runtimeMappings,
          fakeExecutionTimestamp
        );
        const denominatorQuery = getESQuery(
          denominatorParams,
          timestampField,
          indices,
          runtimeMappings,
          fakeExecutionTimestamp
        );

        queries.push(
          {
            annotation: 'Numerator Elasticsearch query', // TODO: i18n
            query: JSON.stringify(numeratorQuery),
          },
          {
            annotation: 'Denominator Elasticsearch query', // TODO: i18n
            query: JSON.stringify(denominatorQuery),
          }
        );
      }

      const explanation: EsQueryExplanation = {
        type: 'ES_QUERY',
        queries,
      };

      return explanation;
    } catch (e) {
      throw new Error(e);
    }
  };
