/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiContextMenu, EuiHorizontalRule, EuiIcon } from '@elastic/eui';
import React, { useMemo } from 'react';
import { Dataset } from '../../../common/datasets';
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
import { buildIntegrationsTree } from './utils';

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
    closePopover,
    changePanel,
    scrollToIntegrationsBottom,
    searchByName,
    selectAllLogDataset,
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
    const allLogDataset = Dataset.createAllLogsDataset();
    const allLogDatasetsItem = {
      name: allLogDataset.title,
      icon: allLogDataset.iconType && <EuiIcon type={allLogDataset.iconType} />,
      onClick: () => selectAllLogDataset(allLogDataset),
    };

    const unmanagedDatasetsItem = {
      name: uncategorizedLabel,
      icon: <EuiIcon type="documents" />,
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

    if (!integrations || integrations.length === 0) {
      return {
        items: [allLogDatasetsItem, unmanagedDatasetsItem, createIntegrationStatusItem()],
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
      />
    </DatasetsPopover>
  );
}
