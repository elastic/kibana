/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import { EuiBadge, EuiBadgeProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { ResultSettingsLogic } from '../result_settings_logic';

enum QueryPerformanceRating {
  Optimal = 'Optimal',
  Good = 'Good',
  Standard = 'Standard',
  Delayed = 'Delayed',
}

type QueryPerformanceBadgePropsCollection = {
  [x in QueryPerformanceRating]: EuiBadgeProps;
};

type QueryPerformanceBadgeContentCollection = {
  [x in QueryPerformanceRating]: string;
};

const QueryPerformanceBadgeProps: QueryPerformanceBadgePropsCollection = {
  [QueryPerformanceRating.Optimal]: {
    color: '#59deb4',
  },
  [QueryPerformanceRating.Good]: {
    color: '#40bfff',
  },
  [QueryPerformanceRating.Standard]: {
    color: '#fed566',
  },
  [QueryPerformanceRating.Delayed]: {
    color: '#ff9173',
  },
};

const QUERY_PERFORMANCE_LABEL = (performanceValue: string) =>
  i18n.translate('xpack.enterpriseSearch.appSearch.engine.resultSettings.queryPerformanceLabel', {
    defaultMessage: 'Query performance: {performanceValue}',
    values: {
      performanceValue,
    },
  });

const QUERY_PERFORMANCE_OPTIMAL = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.resultSettings.queryPerformance.optimalValue',
  { defaultMessage: 'optimal' }
);

const QUERY_PERFORMANCE_GOOD = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.resultSettings.queryPerformance.goodValue',
  { defaultMessage: 'good' }
);

const QUERY_PERFORMANCE_STANDARD = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.resultSettings.queryPerformance.standardValue',
  { defaultMessage: 'standard' }
);

const QUERY_PERFORMANCE_DELAYED = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.resultSettings.queryPerformance.delayedValue',
  { defaultMessage: 'delayed' }
);

const QueryPerformanceBadgeContents: QueryPerformanceBadgeContentCollection = {
  [QueryPerformanceRating.Optimal]: QUERY_PERFORMANCE_LABEL(QUERY_PERFORMANCE_OPTIMAL),
  [QueryPerformanceRating.Good]: QUERY_PERFORMANCE_LABEL(QUERY_PERFORMANCE_GOOD),
  [QueryPerformanceRating.Standard]: QUERY_PERFORMANCE_LABEL(QUERY_PERFORMANCE_STANDARD),
  [QueryPerformanceRating.Delayed]: QUERY_PERFORMANCE_LABEL(QUERY_PERFORMANCE_DELAYED),
};

const getQueryPerformanceRatingForScore = (score: number) => {
  switch (true) {
    case score < 6:
      return QueryPerformanceRating.Optimal;
    case score < 11:
      return QueryPerformanceRating.Good;
    case score < 21:
      return QueryPerformanceRating.Standard;
    default:
      return QueryPerformanceRating.Delayed;
  }
};

export const QueryPerformance: React.FC = () => {
  const { queryPerformanceScore } = useValues(ResultSettingsLogic);
  const queryPerformanceRating = getQueryPerformanceRatingForScore(queryPerformanceScore);
  return (
    <EuiBadge
      className="response-feedback"
      data-test-subj="serverResultFieldsPerformance"
      tabIndex={-1}
      {...QueryPerformanceBadgeProps[queryPerformanceRating]}
    >
      {QueryPerformanceBadgeContents[queryPerformanceRating]}
    </EuiBadge>
  );
};
