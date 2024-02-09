/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiContextMenu, EuiHorizontalRule, EuiTab, EuiTabs } from '@elastic/eui';
import styled from '@emotion/styled';
import React, { useMemo } from 'react';
import { useIntersectionRef } from '../../hooks/use_intersection_ref';
import { getDataViewTestSubj } from '../../utils/get_data_view_test_subj';
import {
  dataViewsLabel,
  DATA_VIEWS_PANEL_ID,
  DATA_VIEWS_TAB_ID,
  DATA_VIEW_POPOVER_CONTENT_WIDTH,
  integrationsLabel,
  INTEGRATIONS_PANEL_ID,
  INTEGRATIONS_TAB_ID,
  uncategorizedLabel,
  UNCATEGORIZED_PANEL_ID,
  UNCATEGORIZED_TAB_ID,
} from './constants';
import { useDatasetSelector } from './state_machine/use_dataset_selector';
import { DatasetsPopover } from './sub_components/datasets_popover';
import { DataViewsPanelTitle } from './sub_components/data_views_panel_title';
import { SearchControls } from './sub_components/search_controls';
import { ESQLButton, SelectorFooter, ShowAllLogsButton } from './sub_components/selector_footer';
import { DatasetSelectorProps } from './types';
import {
  buildIntegrationsTree,
  createDataViewsStatusItem,
  createIntegrationStatusItem,
  createUncategorizedStatusItem,
} from './utils';

export function DatasetSelector({
  datasets,
  datasetSelection,
  datasetsError,
  dataViews,
  dataViewsError,
  discoverEsqlUrlProps,
  integrations,
  integrationsError,
  isEsqlEnabled,
  isLoadingDataViews,
  isLoadingIntegrations,
  isLoadingUncategorized,
  isSearchingIntegrations,
  onDataViewSelection,
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
  onUncategorizedReload,
  onUncategorizedSearch,
  onUncategorizedSort,
  onUncategorizedTabClick,
}: DatasetSelectorProps) {
  const {
    panelId,
    search,
    tabId,
    isOpen,
    isAllMode,
    changePanel,
    closePopover,
    scrollToIntegrationsBottom,
    searchByName,
    selectAllLogDataset,
    selectDataset,
    selectDataView,
    sortByOrder,
    switchToIntegrationsTab,
    switchToUncategorizedTab,
    switchToDataViewsTab,
    togglePopover,
  } = useDatasetSelector({
    initialContext: { selection: datasetSelection },
    onDataViewSelection,
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
    onUncategorizedReload,
    onSelectionChange,
  });

  const [setSpyRef] = useIntersectionRef({ onIntersecting: scrollToIntegrationsBottom });

  const { items: integrationItems, panels: integrationPanels } = useMemo(() => {
    if (!integrations || integrations.length === 0) {
      return {
        items: [
          createIntegrationStatusItem({
            data: integrations,
            error: integrationsError,
            isLoading: isLoadingIntegrations,
            onRetry: onIntegrationsReload,
          }),
        ],
        panels: [],
      };
    }

    return buildIntegrationsTree({
      integrations,
      onDatasetSelected: selectDataset,
      spyRef: setSpyRef,
    });
  }, [
    integrations,
    integrationsError,
    isLoadingIntegrations,
    selectDataset,
    onIntegrationsReload,
    setSpyRef,
  ]);

  const uncategorizedItems = useMemo(() => {
    if (!datasets || datasets.length === 0) {
      return [
        createUncategorizedStatusItem({
          data: datasets,
          error: datasetsError,
          isLoading: isLoadingUncategorized,
          onRetry: onUncategorizedReload,
        }),
      ];
    }

    return datasets.map((dataset) => ({
      name: dataset.title,
      onClick: () => selectDataset(dataset),
    }));
  }, [datasets, datasetsError, isLoadingUncategorized, selectDataset, onUncategorizedReload]);

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
      name: dataView.name,
      onClick: () => selectDataView(dataView),
    }));
  }, [dataViews, dataViewsError, isLoadingDataViews, selectDataView, onDataViewsReload]);

  const tabs = [
    {
      id: INTEGRATIONS_TAB_ID,
      name: integrationsLabel,
      onClick: switchToIntegrationsTab,
      'data-test-subj': 'datasetSelectorIntegrationsTab',
    },
    {
      id: UNCATEGORIZED_TAB_ID,
      name: uncategorizedLabel,
      onClick: () => {
        onUncategorizedTabClick(); // Lazy-load uncategorized datasets only when accessing the Uncategorized tab
        switchToUncategorizedTab();
      },
      'data-test-subj': 'datasetSelectorUncategorizedTab',
    },
    {
      id: DATA_VIEWS_TAB_ID,
      name: dataViewsLabel,
      onClick: () => {
        onDataViewsTabClick(); // Lazy-load data views only when accessing the Data Views tab
        switchToDataViewsTab();
      },
      'data-test-subj': 'datasetSelectorDataViewsTab',
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
    <DatasetsPopover
      selection={datasetSelection.selection}
      isOpen={isOpen}
      closePopover={closePopover}
      onClick={togglePopover}
    >
      <Tabs>{tabEntries}</Tabs>
      <EuiHorizontalRule margin="none" />
      <SearchControls
        key={panelId}
        search={search}
        onSearch={searchByName}
        onSort={sortByOrder}
        isLoading={isSearchingIntegrations || isLoadingUncategorized}
      />
      <EuiHorizontalRule margin="none" />
      {/* For a smoother user experience, we keep each tab content mount and we only show the select one
      "hiding" all the others. Unmounting mounting each tab content on change makes it feel glitchy,
      while the tradeoff of keeping the contents in memory provide a better UX. */}
      {/* Integrations tab content */}
      <ContextMenu
        hidden={tabId !== INTEGRATIONS_TAB_ID}
        initialPanelId={panelId}
        panels={[
          {
            id: INTEGRATIONS_PANEL_ID,
            title: integrationsLabel,
            width: DATA_VIEW_POPOVER_CONTENT_WIDTH,
            items: integrationItems,
          },
          ...integrationPanels,
        ]}
        onPanelChange={changePanel}
        className="eui-yScroll"
        data-test-subj="integrationsContextMenu"
        size="s"
      />
      {/* Uncategorized tab content */}
      <ContextMenu
        hidden={tabId !== UNCATEGORIZED_TAB_ID}
        initialPanelId={UNCATEGORIZED_PANEL_ID}
        panels={[
          {
            id: UNCATEGORIZED_PANEL_ID,
            title: uncategorizedLabel,
            width: DATA_VIEW_POPOVER_CONTENT_WIDTH,
            items: uncategorizedItems,
          },
        ]}
        className="eui-yScroll"
        data-test-subj="uncategorizedContextMenu"
        size="s"
      />
      {/* Data views tab content */}
      <ContextMenu
        hidden={tabId !== DATA_VIEWS_TAB_ID}
        initialPanelId={DATA_VIEWS_PANEL_ID}
        panels={[
          {
            id: DATA_VIEWS_PANEL_ID,
            title: <DataViewsPanelTitle />,
            width: DATA_VIEW_POPOVER_CONTENT_WIDTH,
            items: dataViewsItems,
          },
        ]}
        className="eui-yScroll"
        data-test-subj="dataViewsContextMenu"
        size="s"
      />
      <EuiHorizontalRule margin="none" />
      <SelectorFooter>
        <ShowAllLogsButton isSelected={isAllMode} onClick={selectAllLogDataset} />
        {isEsqlEnabled && <ESQLButton {...discoverEsqlUrlProps} />}
      </SelectorFooter>
    </DatasetsPopover>
  );
}

const Tabs = styled(EuiTabs)`
  padding: 0 8px;
`;

const ContextMenu = styled(EuiContextMenu)`
  max-height: 440px;
  transition: none !important;
`;
