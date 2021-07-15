/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pipe } from 'fp-ts/lib/pipeable';
import { getOrElse } from 'fp-ts/lib/Either';
import { failure } from 'io-ts/lib/PathReporter';
import * as t from 'io-ts';

import type { estypes } from '@elastic/elasticsearch';
import { TRANSACTION_DURATION } from '../../../../common/elasticsearch_fieldnames';
import type { SearchServiceParams } from '../../../../common/search_strategies/correlations/types';
import { rangeRt } from '../../../routes/default_api_types';

import { Setup, SetupTimeRange } from '../../helpers/setup_request';

import { getCorrelationsFilters } from '../../correlations/get_filters';

const getPercentileThresholdValueQuery = (
  percentileThresholdValue: number | undefined
): estypes.QueryDslQueryContainer[] => {
  return percentileThresholdValue
    ? [
        {
          range: {
            [TRANSACTION_DURATION]: {
              gte: percentileThresholdValue,
            },
          },
        },
      ]
    : [];
};

export const getTermsQuery = (
  fieldName: string | undefined,
  fieldValue: string | undefined
) => {
  return fieldName && fieldValue ? [{ term: { [fieldName]: fieldValue } }] : [];
};

interface QueryParams {
  params: SearchServiceParams;
  fieldName?: string;
  fieldValue?: string;
}
export const getQueryWithParams = ({
  params,
  fieldName,
  fieldValue,
}: QueryParams) => {
  const {
    environment,
    kuery,
    serviceName,
    start,
    end,
    percentileThresholdValue,
    transactionType,
    transactionName,
  } = params;

  // converts string based start/end to epochmillis
  const setup = pipe(
    rangeRt.decode({ start, end }),
    getOrElse<t.Errors, { start: number; end: number }>((errors) => {
      throw new Error(failure(errors).join('\n'));
    })
  ) as Setup & SetupTimeRange;

  const filters = getCorrelationsFilters({
    setup,
    environment,
    kuery,
    serviceName,
    transactionType,
    transactionName,
  });

  return {
    bool: {
      filter: [
        ...filters,
        ...getTermsQuery(fieldName, fieldValue),
        ...getPercentileThresholdValueQuery(percentileThresholdValue),
      ] as estypes.QueryDslQueryContainer[],
    },
  };
};
