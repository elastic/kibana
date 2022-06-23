/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  FieldValuePair,
  CommonCorrelationsQueryParams,
} from '../../../../common/correlations/types';
import { TERMS_SIZE } from '../../../../common/correlations/constants';

import { splitAllSettledPromises } from '../utils';
import { Setup } from '../../../lib/helpers/setup_request';
import { ProcessorEvent } from '../../../../common/processor_event';
import { getCommonCorrelationsQuery } from './get_common_correlations_query';

export const fetchFieldValuePairs = async ({
  setup,
  fieldCandidates,
  eventType,
  start,
  end,
  environment,
  kuery,
  query,
}: CommonCorrelationsQueryParams & {
  setup: Setup;
  fieldCandidates: string[];
  eventType: ProcessorEvent;
}): Promise<{ fieldValuePairs: FieldValuePair[]; errors: any[] }> => {
  const { apmEventClient } = setup;

  const { fulfilled: responses, rejected: errors } = splitAllSettledPromises(
    await Promise.allSettled(
      fieldCandidates.map(async (fieldName) => {
        const response = await apmEventClient.search(
          'get_field_value_pairs_for_field_candidate',
          {
            apm: {
              events: [eventType],
            },
            body: {
              size: 0,
              query: getCommonCorrelationsQuery({
                start,
                end,
                environment,
                kuery,
                query,
              }),
              aggs: {
                attribute_terms: {
                  terms: {
                    field: fieldName,
                    size: TERMS_SIZE,
                  },
                },
              },
            },
          }
        );

        return (
          response.aggregations?.attribute_terms.buckets.map((d) => ({
            fieldName,
            // The terms aggregation returns boolean fields as { key: 0, key_as_string: "false" },
            // so we need to pick `key_as_string` if it's present, otherwise searches on boolean fields would fail later on.
            fieldValue: d.key_as_string ?? d.key,
          })) ?? []
        );
      })
    )
  );

  return { fieldValuePairs: responses.flat(), errors };
};
