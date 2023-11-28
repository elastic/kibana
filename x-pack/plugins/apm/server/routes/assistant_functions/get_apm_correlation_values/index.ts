/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import datemath from '@elastic/datemath';
import { AggregationsSignificantTermsAggregation } from '@elastic/elasticsearch/lib/api/types';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { kqlQuery, rangeQuery } from '@kbn/observability-plugin/server';
import * as t from 'io-ts';
import { CorrelationsEventType } from '../../../../common/assistant/constants';
import {
  SERVICE_NAME,
  SERVICE_NODE_NAME,
  SPAN_DESTINATION_SERVICE_RESOURCE,
  SPAN_NAME,
  TRANSACTION_NAME,
  TRANSACTION_RESULT,
} from '../../../../common/es_fields/apm';
import { termQuery } from '../../../../common/utils/term_query';
import {
  APMEventClient,
  APMEventESSearchRequest,
} from '../../../lib/helpers/create_es_client/create_apm_event_client';
import { environmentRt } from '../../default_api_types';

const setRt = t.intersection([
  t.type({
    start: t.string,
    end: t.string,
    'service.name': t.string,
    label: t.string,
  }),
  t.partial({
    filter: t.string,
    'service.environment': environmentRt.props.environment,
  }),
]);

export const correlationValuesRouteRt = t.type({
  sets: t.array(
    t.type({
      foreground: setRt,
      background: setRt,
      event: t.union([
        t.literal(CorrelationsEventType.Transaction),
        t.literal(CorrelationsEventType.ExitSpan),
        t.literal(CorrelationsEventType.Error),
      ]),
    })
  ),
});

export interface CorrelationValue {
  foreground: string;
  background: string;
  fieldName: string;
  fields: Array<{ value: string; score: number }>;
}

export async function getApmCorrelationValues({
  arguments: args,
  apmEventClient,
}: {
  arguments: t.TypeOf<typeof correlationValuesRouteRt>;
  apmEventClient: APMEventClient;
}): Promise<CorrelationValue[]> {
  const getQueryForSet = (set: t.TypeOf<typeof setRt>) => {
    const start = datemath.parse(set.start)?.valueOf()!;
    const end = datemath.parse(set.end)?.valueOf()!;

    return {
      bool: {
        filter: [
          ...rangeQuery(start, end),
          ...termQuery(SERVICE_NAME, set['service.name']),
          ...kqlQuery(set.filter),
        ],
      },
    };
  };

  const allCorrelations = await Promise.all(
    args.sets.map(async (set) => {
      const query = getQueryForSet(set.foreground);

      let apm: APMEventESSearchRequest['apm'];

      let fields: string[] = [];

      switch (set.event) {
        case CorrelationsEventType.Transaction:
          apm = {
            events: [ProcessorEvent.transaction],
          };
          fields = [TRANSACTION_NAME, SERVICE_NODE_NAME, TRANSACTION_RESULT];
          break;

        case CorrelationsEventType.ExitSpan:
          apm = {
            events: [ProcessorEvent.span],
          };
          fields = [SPAN_NAME, SPAN_DESTINATION_SERVICE_RESOURCE];
          query.bool.filter.push({
            exists: {
              field: SPAN_DESTINATION_SERVICE_RESOURCE,
            },
          });
          break;

        case CorrelationsEventType.Error:
          apm = {
            events: [ProcessorEvent.error],
          };
          fields = ['error.grouping_name'];
          break;
      }

      const sigTermsAggs: Record<
        string,
        { significant_terms: AggregationsSignificantTermsAggregation }
      > = {};

      fields.forEach((field) => {
        sigTermsAggs[field] = {
          significant_terms: {
            field,
            background_filter: getQueryForSet(set.background),
            gnd: {
              background_is_superset: false,
            },
          },
        };
      });

      const response = await apmEventClient.search('get_significant_terms', {
        apm,
        body: {
          size: 0,
          track_total_hits: false,
          query,
          aggs: sigTermsAggs,
        },
      });

      const correlations: Array<{
        foreground: string;
        background: string;
        fieldName: string;
        fields: Array<{ value: string; score: number }>;
      }> = [];

      if (!response.aggregations) {
        return { correlations: [] };
      }

      // eslint-disable-next-line guard-for-in
      for (const fieldName in response.aggregations) {
        correlations.push({
          foreground: set.foreground.label,
          background: set.background.label,
          fieldName,
          fields: response.aggregations[fieldName].buckets.map((bucket) => ({
            score: bucket.score,
            value: String(bucket.key),
          })),
        });
      }

      return { correlations };
    })
  );

  return allCorrelations.flatMap((_) => _.correlations);
}
