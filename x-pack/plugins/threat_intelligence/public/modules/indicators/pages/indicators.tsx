/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, VFC } from 'react';
import { useBlockListContext } from '../hooks/use_block_list_context';
import { BlockListProvider } from '../containers/block_list_provider';
import { BlockListFlyout } from '../../block_list/containers/flyout';
import { IndicatorsBarChartWrapper } from '../components/barchart/wrapper';
import { IndicatorsTable } from '../components/table/table';
import { useAggregatedIndicators } from '../hooks/use_aggregated_indicators';
import { useIndicators } from '../hooks/use_indicators';
import { useSourcererDataView } from '../hooks/use_sourcerer_data_view';
import { DefaultPageLayout } from '../../../components/layout';
import { useFilters } from '../../query_bar/hooks/use_filters';
import { FiltersGlobal } from '../../../containers/filters_global';
import { FieldTypesProvider } from '../../../containers/field_types_provider';
import { InspectorProvider } from '../../../containers/inspector';
import { useColumnSettings } from '../hooks/use_column_settings';
import { IndicatorsFilters } from '../containers/filters';
import { UpdateStatus } from '../../../components/update_status';
import { QueryBar } from '../../query_bar/components/query_bar';

const IndicatorsPageProviders: FC = ({ children }) => (
  <IndicatorsFilters>
    <FieldTypesProvider>
      <InspectorProvider>
        <BlockListProvider>{children}</BlockListProvider>
      </InspectorProvider>
    </FieldTypesProvider>
  </IndicatorsFilters>
);

const IndicatorsPageContent: VFC = () => {
  const { blockListIndicatorValue } = useBlockListContext();

  const { browserFields, indexPattern, sourcererDataView } = useSourcererDataView();

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
    query: indicatorListQuery,
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
    query: indicatorChartQuery,
  } = useAggregatedIndicators({
    timeRange,
    filters,
    filterQuery,
  });

  return (
    <FieldTypesProvider>
      <DefaultPageLayout
        pageTitle="Indicators"
        subHeader={<UpdateStatus isUpdating={isFetchingIndicators} updatedAt={dataUpdatedAt} />}
      >
        <FiltersGlobal>
          <QueryBar
            queries={[indicatorChartQuery, indicatorListQuery]}
            sourcererDataView={sourcererDataView}
          />
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

        {blockListIndicatorValue && <BlockListFlyout indicatorFileHash={blockListIndicatorValue} />}
      </DefaultPageLayout>
    </FieldTypesProvider>
  );
};

export const IndicatorsPage: VFC = () => (
  <IndicatorsPageProviders>
    <IndicatorsPageContent />
  </IndicatorsPageProviders>
);
