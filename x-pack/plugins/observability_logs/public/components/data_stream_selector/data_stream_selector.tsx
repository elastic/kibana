/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiContextMenu, EuiContextMenuPanel, EuiHorizontalRule } from '@elastic/eui';
<<<<<<< HEAD
import React, { useMemo } from 'react';
=======
import React, { useCallback, useMemo } from 'react';
>>>>>>> 982e6faf7008f3dd730341c4f1c8d54aa0e13977
import { dynamic } from '../../../common/dynamic';
import { useIntersectionRef } from '../../hooks/use_intersection_ref';
import {
  contextMenuStyles,
  DATA_VIEW_POPOVER_CONTENT_WIDTH,
  integrationsLabel,
  INTEGRATION_PANEL_ID,
  selectDatasetLabel,
  uncategorizedLabel,
  UNMANAGED_STREAMS_PANEL_ID,
} from './constants';
import { useDataStreamSelector } from './state_machine/use_data_stream_selector';
import { DataStreamsPopover } from './sub_components/data_streams_popover';
import { DataStreamSkeleton } from './sub_components/data_streams_skeleton';
<<<<<<< HEAD
import { SearchControls } from './sub_components/search_controls';
=======
import { SearchControls, useSearchStrategy } from './sub_components/search_controls';
>>>>>>> 982e6faf7008f3dd730341c4f1c8d54aa0e13977
import { DataStreamSelectorProps } from './types';
import { buildIntegrationsTree, setIntegrationListSpy } from './utils';

/**
 * Lazy load hidden components
 */
const DataStreamsList = dynamic(() => import('./sub_components/data_streams_list'), {
  fallback: <DataStreamSkeleton />,
});
const IntegrationsListStatus = dynamic(() => import('./sub_components/integrations_list_status'));

/**
 * TODO
 * - Refactor internal state management to work as a SM
 */

export function DataStreamSelector({
  dataStreams,
  dataStreamsError,
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
  onUnmanagedStreamsSearch,
  onUnmanagedStreamsSort,
  onUnmanagedStreamsReload,
  onStreamSelected,
  onStreamsEntryClick,
  title,
}: DataStreamSelectorProps) {
  const {
    isOpen,
    panelId,
    search,
    changePanel,
    scrollToIntegrationsBottom,
    searchByName,
    selectDataStream,
    sortByOrder,
    togglePopover,
  } = useDataStreamSelector({
    onIntegrationsLoadMore,
    onIntegrationsReload,
    onIntegrationsSearch,
    onIntegrationsSort,
    onIntegrationsStreamsSearch,
    onIntegrationsStreamsSort,
    onUnmanagedStreamsSearch,
    onUnmanagedStreamsSort,
    onUnmanagedStreamsReload,
    onStreamSelected,
  });

  const [setSpyRef] = useIntersectionRef({ onIntersecting: scrollToIntegrationsBottom });

  const { items: integrationItems, panels: integrationPanels } = useMemo(() => {
    const dataStreamsItem = {
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
        items: [dataStreamsItem, createIntegrationStatusItem()],
        panels: [],
      };
    }

    const { items, panels } = buildIntegrationsTree({
      integrations,
      onStreamSelected: selectDataStream,
    });

    setIntegrationListSpy(items, setSpyRef);

    if (items.length === 0) items.push(createIntegrationStatusItem());

    return {
      items: [dataStreamsItem, ...items],
      panels,
    };
  }, [
    integrations,
    integrationsError,
    selectDataStream,
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
        <DataStreamsList
          onStreamClick={selectDataStream}
          dataStreams={dataStreams}
          error={dataStreamsError}
          isLoading={isLoadingStreams}
          onRetry={onUnmanagedStreamsReload}
        />
      ),
    },
    ...integrationPanels,
  ];

  return (
    <DataStreamsPopover
      title={title}
      isOpen={isOpen}
      closePopover={togglePopover}
      onClick={togglePopover}
    >
      <EuiContextMenuPanel title={selectDatasetLabel}>
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
      </EuiContextMenuPanel>
    </DataStreamsPopover>
  );
}
