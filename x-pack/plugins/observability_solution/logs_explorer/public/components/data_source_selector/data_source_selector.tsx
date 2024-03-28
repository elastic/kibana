/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiHorizontalRule } from '@elastic/eui';
import React, { useMemo } from 'react';
import { getDataViewTestSubj } from '../../utils/get_data_view_test_subj';
import {
  DATA_VIEWS_TAB_ID,
  INTEGRATIONS_TAB_ID,
  noDatasetsDescriptionLabel,
  noDatasetsLabel,
  noDataViewsDescriptionLabel,
  noDataViewsLabel,
  noIntegrationsDescriptionLabel,
  noIntegrationsLabel,
} from './constants';
import { useDataSourceSelector } from './state_machine/use_data_source_selector';
import { DataViewList } from './sub_components/data_views_list';
import { IntegrationsList } from './sub_components/integrations_list';
import ListStatus from './sub_components/list_status';
import { SearchControls } from './sub_components/search_controls';
import { ESQLButton, SelectorFooter, ShowAllLogsButton } from './sub_components/selector_footer';
import { SelectorPopover } from './sub_components/selector_popover';
import { DataSourceSelectorTabs } from './sub_components/selector_tabs';
import { DataSourceSelectorProps, DataViewTreeItem } from './types';
import { buildIntegrationsTree } from './utils';
import { DataViewsFilter } from './sub_components/data_view_filter';

export function DataSourceSelector({
  datasets,
  dataSourceSelection,
  datasetsError,
  dataViews,
  dataViewCount,
  dataViewsError,
  discoverEsqlUrlProps,
  integrations,
  integrationsError,
  isDataViewAllowed,
  isDataViewAvailable,
  isEsqlEnabled,
  isLoadingDataViews,
  isLoadingIntegrations,
  isLoadingUncategorized,
  isSearchingIntegrations,
  onDataViewsReload,
  onDataViewsSearch,
  onDataViewsFilter,
  onDataViewsSort,
  onDataViewsTabClick,
  onIntegrationsLoadMore,
  onIntegrationsReload,
  onIntegrationsSearch,
  onIntegrationsSort,
  onSelectionChange,
  onUncategorizedLoad,
  onUncategorizedReload,
  onUncategorizedSearch,
}: DataSourceSelectorProps) {
  const {
    search,
    dataViewsFilter,
    tabId,
    isOpen,
    isAllMode,
    closePopover,
    scrollToIntegrationsBottom,
    searchByName,
    filterByType,
    selectAllLogs,
    selectDataset,
    selectDataView,
    sortByOrder,
    switchToIntegrationsTab,
    switchToDataViewsTab,
    togglePopover,
  } = useDataSourceSelector({
    initialContext: { selection: dataSourceSelection },
    onDataViewsSearch,
    onDataViewsFilter,
    onDataViewsSort,
    onIntegrationsLoadMore,
    onIntegrationsReload,
    onIntegrationsSearch,
    onIntegrationsSort,
    onUncategorizedSearch,
    onUncategorizedLoad,
    onUncategorizedReload,
    onSelectionChange,
  });

  const integrationItems = useMemo(() => {
    const datasetsFallback = (
      <ListStatus
        key="uncategorizedStatusItem"
        data={datasets}
        description={noDatasetsDescriptionLabel}
        error={datasetsError}
        isLoading={isLoadingUncategorized}
        onRetry={onUncategorizedReload}
        title={noDatasetsLabel}
      />
    );

    return buildIntegrationsTree({
      datasets,
      datasetsFallback,
      integrations,
      isLoadingUncategorized,
      onDatasetSelected: selectDataset,
    });
  }, [
    datasets,
    datasetsError,
    integrations,
    isLoadingUncategorized,
    onUncategorizedReload,
    selectDataset,
  ]);

  const dataViewsItems: DataViewTreeItem[] = useMemo(() => {
    return dataViews
      ? dataViews.map((dataView) => ({
          'data-test-subj': getDataViewTestSubj(dataView.title),
          name: dataView.name,
          isAllowed: isDataViewAllowed(dataView),
          onClick: () => selectDataView(dataView),
          disabled: !isDataViewAvailable(dataView),
        }))
      : [];
  }, [dataViews, isDataViewAllowed, isDataViewAvailable, selectDataView]);

  const integrationsStatusPrompt = useMemo(
    () => (
      <ListStatus
        key="integrationStatusItem"
        description={noIntegrationsDescriptionLabel}
        title={noIntegrationsLabel}
        data={integrations}
        error={integrationsError}
        isLoading={isLoadingIntegrations}
        onRetry={onIntegrationsReload}
      />
    ),
    [integrations, integrationsError, isLoadingIntegrations, onIntegrationsReload]
  );

  const dataViewsStatusPrompt = useMemo(
    () => (
      <ListStatus
        key="dataViewsStatusItem"
        description={noDataViewsDescriptionLabel}
        title={noDataViewsLabel}
        data={dataViews}
        error={dataViewsError}
        isLoading={isLoadingDataViews}
        onRetry={onDataViewsReload}
      />
    ),
    [dataViews, dataViewsError, isLoadingDataViews, onDataViewsReload]
  );

  const handleDataViewTabClick = () => {
    onDataViewsTabClick(); // Lazy-load data views only when accessing the Data Views tab
    switchToDataViewsTab();
  };

  return (
    <SelectorPopover
      closePopover={closePopover}
      isOpen={isOpen}
      onClick={togglePopover}
      selection={dataSourceSelection}
    >
      <DataSourceSelectorTabs tabId={tabId}>
        <DataSourceSelectorTabs.Integrations onClick={switchToIntegrationsTab} />
        <DataSourceSelectorTabs.DataViews onClick={handleDataViewTabClick} />
      </DataSourceSelectorTabs>
      <EuiHorizontalRule margin="none" />
      {/* For a smoother user experience, we keep each tab content mount and we only show the select one
      "hiding" all the others. Unmounting mounting each tab content on change makes it feel glitchy,
      while the tradeoff of keeping the contents in memory provide a better UX. */}
      {/* Integrations tab content */}
      <IntegrationsList
        hidden={tabId !== INTEGRATIONS_TAB_ID}
        items={integrationItems}
        onScrollEnd={scrollToIntegrationsBottom}
        onSortByName={sortByOrder}
        search={search}
        statusPrompt={integrationsStatusPrompt}
      >
        {tabId === INTEGRATIONS_TAB_ID && (
          <SearchControls
            key={INTEGRATIONS_TAB_ID}
            isLoading={isSearchingIntegrations || isLoadingUncategorized}
            onSearch={searchByName}
            search={search}
          />
        )}
      </IntegrationsList>
      {/* Data views tab content */}
      <DataViewList
        hidden={tabId !== DATA_VIEWS_TAB_ID}
        dataViews={dataViewsItems}
        onSortByName={sortByOrder}
        search={search}
        statusPrompt={dataViewsStatusPrompt}
      >
        {tabId === DATA_VIEWS_TAB_ID && (
          <SearchControls
            key={DATA_VIEWS_TAB_ID}
            onSearch={searchByName}
            search={search}
            filterComponent={
              tabId === DATA_VIEWS_TAB_ID && (
                <DataViewsFilter
                  filter={dataViewsFilter}
                  count={dataViewCount}
                  onFilter={filterByType}
                />
              )
            }
          />
        )}
        <EuiHorizontalRule margin="none" />
      </DataViewList>
      <EuiHorizontalRule margin="none" />
      <SelectorFooter>
        <ShowAllLogsButton isSelected={isAllMode} onClick={selectAllLogs} />
        {isEsqlEnabled && <ESQLButton {...discoverEsqlUrlProps} />}
      </SelectorFooter>
    </SelectorPopover>
  );
}
