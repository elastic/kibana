/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiHorizontalRule, EuiTab, EuiTabs } from '@elastic/eui';
import styled from '@emotion/styled';
import React, { useMemo } from 'react';
import { euiThemeVars } from '@kbn/ui-theme';
import { getDataViewTestSubj } from '../../utils/get_data_view_test_subj';
import {
  dataViewsLabel,
  DATA_VIEWS_PANEL_ID,
  DATA_VIEWS_TAB_ID,
  integrationsLabel,
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
import { AddDataButton } from './sub_components/add_data_button';
import { IntegrationsList } from './sub_components/integrations_list';
import { DataViewList } from './sub_components/data_views_list';
import ListStatus from './sub_components/list_status';

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
  onIntegrationsStreamsSearch,
  onIntegrationsStreamsSort,
  onSelectionChange,
  onUncategorizedLoad,
  onUncategorizedReload,
  onUncategorizedSearch,
  onUncategorizedSort,
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
    onIntegrationsStreamsSearch,
    onIntegrationsStreamsSort,
    onUncategorizedSearch,
    onUncategorizedSort,
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

  const tabs = [
    {
      id: INTEGRATIONS_TAB_ID,
      name: integrationsLabel,
      onClick: switchToIntegrationsTab,
      'data-test-subj': 'dataSourceSelectorIntegrationsTab',
    },
    {
      id: DATA_VIEWS_TAB_ID,
      name: dataViewsLabel,
      onClick: () => {
        onDataViewsTabClick(); // Lazy-load data views only when accessing the Data Views tab
        switchToDataViewsTab();
      },
      'data-test-subj': 'dataSourceSelectorDataViewsTab',
    },
  ];

  const tabEntries = tabs.map((tab) => (
    <EuiTab
      key={tab.id}
      onClick={tab.onClick}
      isSelected={tab.id === tabId}
      data-test-subj={tab['data-test-subj']}
    >
      {tab.name}
    </EuiTab>
  ));

  return (
    <SelectorPopover
      selection={dataSourceSelection}
      isOpen={isOpen}
      closePopover={closePopover}
      onClick={togglePopover}
    >
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
        <Tabs bottomBorder={false}>{tabEntries}</Tabs>
        {tabId === INTEGRATIONS_TAB_ID && <AddDataButton />}
      </EuiFlexGroup>
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
      <DataViewList
        hidden={tabId !== DATA_VIEWS_TAB_ID}
        panels={[
          {
            id: DATA_VIEWS_PANEL_ID,
            title: dataViewsLabel,
            width: '100%',
            items: dataViewsItems,
          },
        ]}
      >
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

const Tabs = styled(EuiTabs)`
  padding: 0 ${euiThemeVars.euiSizeS};
`;
