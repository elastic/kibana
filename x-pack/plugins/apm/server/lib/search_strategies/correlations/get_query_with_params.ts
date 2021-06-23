/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import {
  TRANSACTION_DURATION,
  TRANSACTION_NAME,
  PROCESSOR_EVENT,
  SERVICE_NAME,
} from '../../../../common/elasticsearch_fieldnames';
import type { SearchServiceParams } from '../../../../common/search_strategies/correlations/types';
import { environmentQuery as getEnvironmentQuery } from '../../../utils/queries';

export enum ProcessorEvent {
  transaction = 'transaction',
  error = 'error',
  metric = 'metric',
  span = 'span',
  profile = 'profile',
}

const getRangeQuery = (
  start?: string,
  end?: string
): estypes.QueryDslQueryContainer[] => {
  return [
    {
      range: {
        '@timestamp': {
          ...(start !== undefined ? { gte: start } : {}),
          ...(end !== undefined ? { lte: end } : {}),
        },
      },
    },
  ];
};

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

const getTermsQuery = (fieldName: string, fieldValue: string | undefined) => {
  return fieldValue ? [{ term: { [fieldName]: fieldValue } }] : [];
};

export const getQueryWithParams = ({
  environment,
  serviceName,
  start,
  end,
  percentileThresholdValue,
  transactionName,
}: SearchServiceParams) => {
  return {
    bool: {
      filter: [
        ...getTermsQuery(PROCESSOR_EVENT, ProcessorEvent.transaction),
        ...getTermsQuery(SERVICE_NAME, serviceName),
        ...getTermsQuery(TRANSACTION_NAME, transactionName),
        ...getRangeQuery(start, end),
        ...getEnvironmentQuery(environment),
        ...getPercentileThresholdValueQuery(percentileThresholdValue),
      ] as estypes.QueryDslQueryContainer[],
    },
  };
};
