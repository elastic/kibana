/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, VFC } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { IndicatorsBarChartWrapper } from './components/indicators_barchart_wrapper/indicators_barchart_wrapper';
import { IndicatorsTable } from './components/indicators_table/indicators_table';
import { useIndicators } from './hooks/use_indicators';
import { DefaultPageLayout } from '../../components/layout';
import { useFilters } from '../query_bar/hooks/use_filters';
import { FiltersGlobal } from '../../containers/filters_global';
import QueryBar from '../query_bar/components/query_bar';
import { useSourcererDataView } from './hooks/use_sourcerer_data_view';
import { FieldTypesProvider } from '../../containers/field_types_provider';
import { InspectorProvider } from '../../containers/inspector';
import { useColumnSettings } from './components/indicators_table/hooks/use_column_settings';
import { useAggregatedIndicators } from './hooks/use_aggregated_indicators';
import { IndicatorsFilters } from './containers/indicators_filters';

const queryClient = new QueryClient();

const IndicatorsPageProviders: FC = ({ children }) => (
  <QueryClientProvider client={queryClient}>
    <IndicatorsFilters>
      <FieldTypesProvider>
        <InspectorProvider>{children}</InspectorProvider>
      </FieldTypesProvider>
    </IndicatorsFilters>
  </QueryClientProvider>
);

const IndicatorsPageContent: VFC = () => {
  const { browserFields, indexPattern } = useSourcererDataView();

  const columnSettings = useColumnSettings();

  const {
    timeRange,
    filters,
    filterManager,
    filterQuery,
    handleSubmitQuery,
    handleSubmitTimeRange,
    handleSavedQuery,
    savedQuery,
  } = useFilters();

  const {
    handleRefresh,
    indicatorCount,
    indicators,
    isLoading,
    onChangeItemsPerPage,
    onChangePage,
    pagination,
  } = useIndicators({
    filters,
    filterQuery,
    timeRange,
    sorting: columnSettings.sorting.columns,
  });

  const { dateRange, series, selectedField, onFieldChange } = useAggregatedIndicators({
    timeRange,
    filters,
    filterQuery,
  });

  return (
    <FieldTypesProvider>
      <DefaultPageLayout pageTitle="Indicators">
        <FiltersGlobal>
          <QueryBar
            dateRangeFrom={timeRange?.from}
            dateRangeTo={timeRange?.to}
            indexPattern={indexPattern}
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
        <IndicatorsBarChartWrapper
          dateRange={dateRange}
          series={series}
          timeRange={timeRange}
          indexPattern={indexPattern}
          field={selectedField}
          onFieldChange={onFieldChange}
        />
        <IndicatorsTable
          browserFields={browserFields}
          indexPattern={indexPattern}
          columnSettings={columnSettings}
          pagination={pagination}
          indicatorCount={indicatorCount}
          indicators={indicators}
          isLoading={isLoading}
          onChangeItemsPerPage={onChangeItemsPerPage}
          onChangePage={onChangePage}
        />
      </DefaultPageLayout>
    </FieldTypesProvider>
  );
};

export const IndicatorsPage: VFC = () => (
  <IndicatorsPageProviders>
    <IndicatorsPageContent />
  </IndicatorsPageProviders>
);

// Note: This is for lazy loading
// eslint-disable-next-line import/no-default-export
export default IndicatorsPage;
