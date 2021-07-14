/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import {
  PROCESSOR_EVENT,
  SERVICE_NAME,
  TRANSACTION_DURATION,
  TRANSACTION_NAME,
} from '../../../../common/elasticsearch_fieldnames';
import type { SearchServiceParams } from '../../../../common/search_strategies/correlations/types';
import { environmentQuery as getEnvironmentQuery } from '../../../../common/utils/environment_query';
import { ProcessorEvent } from '../../../../common/processor_event';

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

const getRangeQuery = (
  start?: string,
  end?: string
): estypes.QueryDslQueryContainer[] => {
  if (start === undefined && end === undefined) {
    return [];
  }

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
    serviceName,
    start,
    end,
    percentileThresholdValue,
    transactionName,
  } = params;
  return {
    bool: {
      filter: [
        ...getTermsQuery(PROCESSOR_EVENT, ProcessorEvent.transaction),
        ...getTermsQuery(SERVICE_NAME, serviceName),
        ...getTermsQuery(TRANSACTION_NAME, transactionName),
        ...getTermsQuery(fieldName, fieldValue),
        ...getRangeQuery(start, end),
        ...getEnvironmentQuery(environment),
        ...getPercentileThresholdValueQuery(percentileThresholdValue),
      ] as estypes.QueryDslQueryContainer[],
    },
  };
};
