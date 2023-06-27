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
import { buildIntegrationsTree, setIntegrationListSpy } from './utils';

/**
 * Lazy load hidden components
 */
const DatasetsList = dynamic(() => import('./sub_components/datasets_list'), {
  fallback: <DatasetSkeleton />,
});
const IntegrationsListStatus = dynamic(() => import('./sub_components/integrations_list_status'));

export function DatasetSelector({
  datasets,
  datasetsError,
  initialSelected,
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
  onDatasetSelected,
  onStreamsEntryClick,
  onUnmanagedStreamsReload,
  onUnmanagedStreamsSearch,
  onUnmanagedStreamsSort,
}: DatasetSelectorProps) {
  const {
    isOpen,
    panelId,
    search,
    selected,
    changePanel,
    scrollToIntegrationsBottom,
    searchByName,
    selectDataset,
    sortByOrder,
    togglePopover,
  } = useDatasetSelector({
    initialContext: { selected: initialSelected },
    onIntegrationsLoadMore,
    onIntegrationsReload,
    onIntegrationsSearch,
    onIntegrationsSort,
    onIntegrationsStreamsSearch,
    onIntegrationsStreamsSort,
    onUnmanagedStreamsSearch,
    onUnmanagedStreamsSort,
    onUnmanagedStreamsReload,
    onDatasetSelected,
  });

  const [setSpyRef] = useIntersectionRef({ onIntersecting: scrollToIntegrationsBottom });

  const { items: integrationItems, panels: integrationPanels } = useMemo(() => {
    const datasetsItem = {
      name: uncategorizedLabel,
      onClick: onStreamsEntryClick,
      panel: UNMANAGED_STREAMS_PANEL_ID,
    };

    const createIntegrationStatusItem = () => ({
      disabled: true,
      name: (
        <IntegrationsListStatus
          error={integrationsError}
          integrations={integrations}
          onRetry={onIntegrationsReload}
        />
      ),
    });

    if (!integrations) {
      return {
        items: [datasetsItem, createIntegrationStatusItem()],
        panels: [],
      };
    }

    const { items, panels } = buildIntegrationsTree({
      integrations,
      onDatasetSelected: selectDataset,
      spyRef: setSpyRef,
    });

    if (items.length === 0) items.push(createIntegrationStatusItem());

    return {
      items: [datasetsItem, ...items],
      panels,
    };
  }, [
    integrations,
    integrationsError,
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
      selected={selected}
      isOpen={isOpen}
      closePopover={togglePopover}
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
      />
    </DatasetsPopover>
  );
}
