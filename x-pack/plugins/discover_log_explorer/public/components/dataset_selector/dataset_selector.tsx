/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiContextMenu, EuiHorizontalRule } from '@elastic/eui';
import React, { useMemo } from 'react';
import { useIntersectionRef } from '../../hooks/use_intersection_ref';
import { dynamic } from '../../utils/dynamic';
import {
  contextMenuStyles,
  DATA_VIEW_POPOVER_CONTENT_WIDTH,
  integrationsLabel,
  INTEGRATION_PANEL_ID,
  uncategorizedLabel,
  UNMANAGED_STREAMS_PANEL_ID,
} from './constants';
import { useDatasetSelector } from './state_machine/use_dataset_selector';
import { DatasetsPopover } from './sub_components/datasets_popover';
import { DatasetSkeleton } from './sub_components/datasets_skeleton';
import { SearchControls } from './sub_components/search_controls';
import { DatasetSelectorProps } from './types';
import {
  buildIntegrationsTree,
  createAllLogDatasetsItem,
  createUnmanagedDatasetsItem,
  createIntegrationStatusItem,
} from './utils';

/**
 * Lazy load hidden components
 */
const DatasetsList = dynamic(() => import('./sub_components/datasets_list'), {
  fallback: <DatasetSkeleton />,
});

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
    closePopover,
    changePanel,
    scrollToIntegrationsBottom,
    searchByName,
    selectAllLogDataset,
    selectDataset,
    sortByOrder,
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
    const allLogDatasetsItem = createAllLogDatasetsItem({ onClick: selectAllLogDataset });
    const unmanagedDatasetsItem = createUnmanagedDatasetsItem({ onClick: onStreamsEntryClick });

    if (!integrations || integrations.length === 0) {
      return {
        items: [
          allLogDatasetsItem,
          unmanagedDatasetsItem,
          createIntegrationStatusItem({
            error: integrationsError,
            integrations,
            onRetry: onIntegrationsReload,
          }),
        ],
        panels: [],
      };
    }

    const { items, panels } = buildIntegrationsTree({
      integrations,
      onDatasetSelected: selectDataset,
      spyRef: setSpyRef,
    });

    return {
      items: [allLogDatasetsItem, unmanagedDatasetsItem, ...items],
      panels,
    };
  }, [
    integrations,
    integrationsError,
    selectAllLogDataset,
    selectDataset,
    onIntegrationsReload,
    onStreamsEntryClick,
    setSpyRef,
  ]);

  const panels = [
    {
      id: INTEGRATION_PANEL_ID,
      title: integrationsLabel,
      width: DATA_VIEW_POPOVER_CONTENT_WIDTH,
      items: integrationItems,
    },
    {
      id: UNMANAGED_STREAMS_PANEL_ID,
      title: uncategorizedLabel,
      width: DATA_VIEW_POPOVER_CONTENT_WIDTH,
      content: (
        <DatasetsList
          datasets={datasets}
          error={datasetsError}
          isLoading={isLoadingStreams}
          onRetry={onUnmanagedStreamsReload}
          onDatasetClick={selectDataset}
        />
      ),
    },
    ...integrationPanels,
  ];

  return (
    <DatasetsPopover
      selection={datasetSelection.selection}
      isOpen={isOpen}
      closePopover={closePopover}
      onClick={togglePopover}
    >
      <SearchControls
        key={panelId}
        search={search}
        onSearch={searchByName}
        onSort={sortByOrder}
        isLoading={isLoadingIntegrations || isLoadingStreams}
      />
      <EuiHorizontalRule margin="none" />
      <EuiContextMenu
        initialPanelId={panelId}
        panels={panels}
        onPanelChange={changePanel}
        className="eui-yScroll"
        css={contextMenuStyles}
        data-test-subj="datasetSelectorContextMenu"
        size="s"
      />
    </DatasetsPopover>
  );
}
