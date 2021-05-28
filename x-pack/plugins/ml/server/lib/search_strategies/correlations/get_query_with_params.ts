/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryContainer } from '@elastic/elasticsearch/api/types';

import { i18n } from '@kbn/i18n';

import type { SearchServiceParams } from './async_search_service';

import { TRANSACTION_DURATION_US } from './constants';

export enum ProcessorEvent {
  transaction = 'transaction',
  error = 'error',
  metric = 'metric',
  span = 'span',
  profile = 'profile',
}

const PROCESSOR_EVENT = 'processor.event';
const SERVICE_ENVIRONMENT = 'service.environment';
const SERVICE_NAME = 'service.name';
const TRANSACTION_TYPE = 'transaction.type';

const ENVIRONMENT_ALL_VALUE = 'ENVIRONMENT_ALL';
const ENVIRONMENT_NOT_DEFINED_VALUE = 'ENVIRONMENT_NOT_DEFINED';

const environmentLabels: Record<string, string> = {
  [ENVIRONMENT_ALL_VALUE]: i18n.translate('xpack.ml.filter.environment.allLabel', {
    defaultMessage: 'All',
  }),
  [ENVIRONMENT_NOT_DEFINED_VALUE]: i18n.translate('xpack.ml.filter.environment.notDefinedLabel', {
    defaultMessage: 'Not defined',
  }),
};

const ENVIRONMENT_ALL = {
  esFieldValue: undefined,
  value: ENVIRONMENT_ALL_VALUE,
  text: environmentLabels[ENVIRONMENT_ALL_VALUE],
};

export const ENVIRONMENT_NOT_DEFINED = {
  esFieldValue: undefined,
  value: ENVIRONMENT_NOT_DEFINED_VALUE,
  text: environmentLabels[ENVIRONMENT_NOT_DEFINED_VALUE],
};

const getEnvironmentQuery = (environment?: string): QueryContainer[] => {
  if (!environment || environment === ENVIRONMENT_ALL.value) {
    return [];
  }

  if (environment === ENVIRONMENT_NOT_DEFINED.value) {
    return [{ bool: { must_not: { exists: { field: SERVICE_ENVIRONMENT } } } }];
  }

  return [{ term: { [SERVICE_ENVIRONMENT]: environment } }];
};

const getRangeQuery = (start?: string, end?: string): QueryContainer[] => {
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

const getPercentileThresholdValueQuery = (percentileThresholdValue: number): QueryContainer[] => {
  return [
    {
      range: {
        [TRANSACTION_DURATION_US]: {
          gte: percentileThresholdValue,
        },
      },
    },
  ];
};

export const getQueryWithParams = ({
  environment,
  serviceName,
  transactionType,
  start,
  end,
  percentileThresholdValue,
}: SearchServiceParams) => {
  return {
    bool: {
      filter: [
        { term: { [PROCESSOR_EVENT]: ProcessorEvent.transaction } },
        ...(serviceName ? [{ term: { [SERVICE_NAME]: serviceName } }] : []),
        ...(transactionType ? [{ term: { [TRANSACTION_TYPE]: transactionType } }] : []),
        ...getRangeQuery(start, end),
        ...getEnvironmentQuery(environment),
        ...(percentileThresholdValue
          ? getPercentileThresholdValueQuery(percentileThresholdValue)
          : []),
      ] as QueryContainer[],
    },
  };
};
