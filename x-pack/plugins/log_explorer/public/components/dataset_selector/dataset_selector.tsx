/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import styled from '@emotion/styled';
import { EuiContextMenu, EuiHorizontalRule, EuiTab, EuiTabs } from '@elastic/eui';
import { useIntersectionRef } from '../../hooks/use_intersection_ref';
import {
  contextMenuStyles,
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
import { SearchControls } from './sub_components/search_controls';
import { SelectorActions } from './sub_components/selector_actions';
import { DatasetSelectorProps } from './types';
import {
  buildIntegrationsTree,
  createIntegrationStatusItem,
  createUncategorizedStatusItem,
} from './utils';
import { useLazyRef } from '../../hooks/use_lazy_ref';

export function DatasetSelector({
  datasets,
  datasetsError,
  datasetSelection,
  integrations,
  integrationsError,
  isLoadingIntegrations,
  isLoadingStreams,
  onIntegrationsLoadMore,
  onIntegrationsReload,
  onIntegrationsSearch,
  onIntegrationsSort,
  onIntegrationsStreamsSearch,
  onIntegrationsStreamsSort,
  onSelectionChange,
  onStreamsEntryClick,
  onUnmanagedStreamsReload,
  onUnmanagedStreamsSearch,
  onUnmanagedStreamsSort,
}: DatasetSelectorProps) {
  const {
    isOpen,
    panelId,
    search,
    selection,
    tabId,
    changePanel,
    closePopover,
    scrollToIntegrationsBottom,
    searchByName,
    selectAllLogDataset,
    selectDataset,
    sortByOrder,
    switchToIntegrationsTab,
    switchToUncategorizedTab,
    togglePopover,
  } = useDatasetSelector({
    initialContext: { selection: datasetSelection },
    onIntegrationsLoadMore,
    onIntegrationsReload,
    onIntegrationsSearch,
    onIntegrationsSort,
    onIntegrationsStreamsSearch,
    onIntegrationsStreamsSort,
    onUnmanagedStreamsSearch,
    onUnmanagedStreamsSort,
    onUnmanagedStreamsReload,
    onSelectionChange,
  });

  const [setSpyRef] = useIntersectionRef({ onIntersecting: scrollToIntegrationsBottom });

  const { items: integrationItems, panels: integrationPanels } = useMemo(() => {
    if (!integrations || integrations.length === 0) {
      return {
        items: [
          createIntegrationStatusItem({
            error: integrationsError,
            integrations,
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
  }, [integrations, integrationsError, selectDataset, onIntegrationsReload, setSpyRef]);

  const uncategorizedItems = useMemo(() => {
    if (!datasets || datasets.length === 0) {
      return [
        createUncategorizedStatusItem({
          datasets,
          error: datasetsError,
          isLoading: isLoadingStreams,
          onRetry: onUnmanagedStreamsReload,
        }),
      ];
    }

    return datasets.map((dataset) => ({
      name: dataset.title,
      onClick: () => selectDataset(dataset),
    }));
  }, [datasets, datasetsError, isLoadingStreams, selectDataset, onUnmanagedStreamsReload]);

  const tabs = [
    {
      id: INTEGRATIONS_TAB_ID,
      name: integrationsLabel,
      onClick: switchToIntegrationsTab,
    },
    {
      id: UNCATEGORIZED_TAB_ID,
      name: uncategorizedLabel,
      onClick: () => {
        onStreamsEntryClick();
        switchToUncategorizedTab();
      },
    },
  ];

  // This map allow to keep track of which tabs content have been rendered the first time.
  // We need it in order to load a tab content only if it gets clicked, and then keep it in the DOM for performance improvement.
  const renderedTabsSet = useLazyRef(() => new Set([tabId]));

  const tabEntries = tabs.map((tab) => (
    <EuiTab
      key={tab.id}
      onClick={() => {
        renderedTabsSet.current.add(tab.id); // On a tab click, mark the tab content as allowed to be rendered
        if (tab.onClick) tab.onClick();
      }}
      isSelected={tab.id === tabId}
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
      <SelectorActions>
        <SelectorActions.ShowAllLogs
          isSelected={selection.selectionType === 'all'}
          onClick={selectAllLogDataset}
        />
      </SelectorActions>
      <EuiHorizontalRule margin="none" />
      <SearchControls
        key={panelId}
        search={search}
        onSearch={searchByName}
        onSort={sortByOrder}
        isLoading={isLoadingIntegrations || isLoadingStreams}
      />
      <EuiHorizontalRule margin="none" />
      {renderedTabsSet.current.has(INTEGRATIONS_TAB_ID) && (
        <EuiContextMenu
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
          css={contextMenuStyles}
          data-test-subj="datasetSelectorContextMenu"
          size="s"
        />
      )}
      {renderedTabsSet.current.has(UNCATEGORIZED_TAB_ID) && (
        <EuiContextMenu
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
          css={contextMenuStyles}
          size="s"
        />
      )}
    </DatasetsPopover>
  );
}

const Tabs = styled(EuiTabs)`
  padding: 0 8px;
`;
