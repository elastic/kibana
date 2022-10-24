/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, VFC } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { IndicatorsBarChartWrapper } from '../components/barchart';
import { IndicatorsTable } from '../components/table';
import { useIndicators } from '../hooks/use_indicators';
import { DefaultPageLayout } from '../../../components/layout';
import { useFilters } from '../../query_bar';
import { FiltersGlobal } from '../../../containers/filters_global';
import { useSourcererDataView } from '../hooks/use_sourcerer_data_view';
import { FieldTypesProvider } from '../../../containers/field_types_provider';
import { InspectorProvider } from '../../../containers/inspector';
import { useColumnSettings } from '../components/table/hooks';
import { useAggregatedIndicators } from '../hooks/use_aggregated_indicators';
import { IndicatorsFilters } from '../containers/filters';
import { useSecurityContext } from '../../../hooks/use_security_context';
import { UpdateStatus } from '../../../components/update_status';

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

  const { timeRange, filters, filterQuery } = useFilters();

  const {
    indicatorCount,
    indicators,
    onChangeItemsPerPage,
    onChangePage,
    pagination,
    isLoading: isLoadingIndicators,
    isFetching: isFetchingIndicators,
    dataUpdatedAt,
  } = useIndicators({
    filters,
    filterQuery,
    timeRange,
    sorting: columnSettings.sorting.columns,
  });

  const {
    dateRange,
    series,
    selectedField,
    onFieldChange,
    isLoading: isLoadingAggregatedIndicators,
    isFetching: isFetchingAggregatedIndicators,
  } = useAggregatedIndicators({
    timeRange,
    filters,
    filterQuery,
  });

  const { SiemSearchBar } = useSecurityContext();

  return (
    <FieldTypesProvider>
      <DefaultPageLayout
        pageTitle="Indicators"
        subHeader={<UpdateStatus isUpdating={isFetchingIndicators} updatedAt={dataUpdatedAt} />}
      >
        <FiltersGlobal>
          <SiemSearchBar indexPattern={indexPattern} id="global" />
        </FiltersGlobal>

        <IndicatorsBarChartWrapper
          dateRange={dateRange}
          series={series}
          timeRange={timeRange}
          indexPattern={indexPattern}
          field={selectedField}
          onFieldChange={onFieldChange}
          isFetching={isFetchingAggregatedIndicators}
          isLoading={isLoadingAggregatedIndicators}
        />

        <IndicatorsTable
          browserFields={browserFields}
          indexPattern={indexPattern}
          columnSettings={columnSettings}
          pagination={pagination}
          indicatorCount={indicatorCount}
          indicators={indicators}
          isLoading={isLoadingIndicators}
          isFetching={isFetchingIndicators}
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
