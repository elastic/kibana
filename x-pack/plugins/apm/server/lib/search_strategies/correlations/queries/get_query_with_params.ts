/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { getOrElse } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';
import * as t from 'io-ts';
import { failure } from 'io-ts/lib/PathReporter';
import type { SearchServiceFetchParams } from '../../../../../common/search_strategies/correlations/types';
import { rangeRt } from '../../../../routes/default_api_types';
import { getCorrelationsFilters } from '../../../correlations/get_filters';
import { Setup, SetupTimeRange } from '../../../helpers/setup_request';

export const getTermsQuery = (
  fieldName: string | undefined,
  fieldValue: string | undefined
) => {
  return fieldName && fieldValue ? [{ term: { [fieldName]: fieldValue } }] : [];
};

interface QueryParams {
  params: SearchServiceFetchParams;
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
      ] as estypes.QueryDslQueryContainer[],
    },
  };
};
