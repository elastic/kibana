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
  noIntegrationsDescriptionLabel,
  noIntegrationsLabel,
} from './constants';
import { useDataSourceSelector } from './state_machine/use_data_source_selector';
import { SelectorPopover } from './sub_components/selector_popover';
import { DataViewMenuItem } from './sub_components/data_view_menu_item';
import { SearchControls } from './sub_components/search_controls';
import { ESQLButton, SelectorFooter, ShowAllLogsButton } from './sub_components/selector_footer';
import { DataSourceSelectorProps } from './types';
import { buildIntegrationsTree, createDataViewsStatusItem } from './utils';
import { IntegrationsList } from './sub_components/integrations_list';
import { DataViewList } from './sub_components/data_views_list';
import ListStatus from './sub_components/list_status';
import { DataSourceSelectorTabs } from './sub_components/selector_tabs';

export function DataSourceSelector({
  datasets,
  dataSourceSelection,
  datasetsError,
  dataViews,
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
    tabId,
    isOpen,
    isAllMode,
    closePopover,
    scrollToIntegrationsBottom,
    searchByName,
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

  const dataViewsItems = useMemo(() => {
    if (!dataViews || dataViews.length === 0) {
      return [
        createDataViewsStatusItem({
          data: dataViews,
          error: dataViewsError,
          isLoading: isLoadingDataViews,
          onRetry: onDataViewsReload,
        }),
      ];
    }

    return dataViews.map((dataView) => ({
      'data-test-subj': getDataViewTestSubj(dataView.title),
      name: <DataViewMenuItem dataView={dataView} isAvailable={isDataViewAllowed(dataView)} />,
      onClick: () => selectDataView(dataView),
      disabled: !isDataViewAvailable(dataView),
    }));
  }, [
    dataViews,
    dataViewsError,
    isDataViewAllowed,
    isDataViewAvailable,
    isLoadingDataViews,
    onDataViewsReload,
    selectDataView,
  ]);

  const handleDataViewTabClick = () => {
    onDataViewsTabClick(); // Lazy-load data views only when accessing the Data Views tab
    switchToDataViewsTab();
  };

  return (
    <SelectorPopover
      selection={dataSourceSelection}
      isOpen={isOpen}
      closePopover={closePopover}
      onClick={togglePopover}
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
        items={integrationItems}
        hidden={tabId !== INTEGRATIONS_TAB_ID}
        onScrollEnd={scrollToIntegrationsBottom}
        onSortByName={sortByOrder}
        search={search}
        statusPrompt={integrationsStatusPrompt}
      >
        <SearchControls
          key={INTEGRATIONS_TAB_ID}
          search={search}
          onSearch={searchByName}
          isLoading={isSearchingIntegrations || isLoadingUncategorized}
        />
      </IntegrationsList>
      {/* Data views tab content */}
      <DataViewList hidden={tabId !== DATA_VIEWS_TAB_ID} items={dataViewsItems}>
        <SearchControls
          key={DATA_VIEWS_TAB_ID}
          search={search}
          onSearch={searchByName}
          onSort={sortByOrder}
        />
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
