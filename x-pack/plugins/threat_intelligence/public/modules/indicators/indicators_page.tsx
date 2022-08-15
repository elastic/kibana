/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { VFC } from 'react';
import { IndicatorsBarChartWrapper } from './components/indicators_barchart_wrapper/indicators_barchart_wrapper';
import { IndicatorsTable } from './components/indicators_table/indicators_table';
import { useIndicators } from './hooks/use_indicators';
import { EmptyPage } from '../empty_page';
import { useIndicatorsTotalCount } from './hooks/use_indicators_total_count';
import { DefaultPageLayout } from '../../components/layout';
import { useFilters } from './hooks/use_filters';
import { FiltersGlobal } from '../../containers/filters_global';
import QueryBar from './components/query_bar';

export const IndicatorsPage: VFC = () => {
  const { count: indicatorsTotalCount, isLoading: isIndicatorsTotalCountLoading } =
    useIndicatorsTotalCount();

  const {
    timeRange,
    indexPatterns,
    filters,
    filterManager,
    filterQuery,
    handleSubmitQuery,
    handleSubmitTimeRange,
    handleSavedQuery,
    savedQuery,
  } = useFilters();

  const { handleRefresh, ...indicators } = useIndicators({
    filters,
    filterQuery,
    timeRange,
  });

  // This prevents indicators table flash when total count is loading.
  // TODO: Improve this with custom loader component. It would require changes to security solutions' template wrapper - to allow
  // 'template' overrides.
  if (isIndicatorsTotalCountLoading) {
    return null;
  }

  const showEmptyPage = indicatorsTotalCount === 0;

  return showEmptyPage ? (
    <EmptyPage />
  ) : (
    <DefaultPageLayout pageTitle="Indicators">
      <FiltersGlobal>
        <QueryBar
          dateRangeFrom={timeRange?.from}
          dateRangeTo={timeRange?.to}
          indexPatterns={indexPatterns}
          filterQuery={filterQuery}
          filterManager={filterManager}
          filters={filters}
          dataTestSubj="iocListPageQueryInput"
          displayStyle="detached"
          savedQuery={savedQuery}
          onRefresh={handleRefresh}
          onSubmitQuery={handleSubmitQuery}
          onSavedQuery={handleSavedQuery}
          onSubmitDateRange={handleSubmitTimeRange}
        />
      </FiltersGlobal>
      <IndicatorsBarChartWrapper timeRange={timeRange} indexPatterns={indexPatterns} />
      <IndicatorsTable {...indicators} indexPatterns={indexPatterns} />
    </DefaultPageLayout>
  );
};

// Note: This is for lazy loading
// eslint-disable-next-line import/no-default-export
export default IndicatorsPage;
