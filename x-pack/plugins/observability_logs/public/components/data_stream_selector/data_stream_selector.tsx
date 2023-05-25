/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiContextMenu, EuiContextMenuPanel, EuiHorizontalRule } from '@elastic/eui';
import { EuiContextMenuPanelId } from '@elastic/eui/src/components/context_menu/context_menu';
import React, { useCallback, useMemo, useState } from 'react';
import { dynamic } from '../../../common/dynamic';
import type { DataStreamSelectionHandler } from '../../customizations/custom_data_stream_selector';
import { useIntersectionRef } from '../../hooks/use_intersection_ref';
import {
  contextMenuStyles,
  DATA_VIEW_POPOVER_CONTENT_WIDTH,
  integrationsLabel,
  INTEGRATION_PANEL_ID,
  selectDatasetLabel,
  uncategorizedLabel,
  UNCATEGORIZED_STREAMS_PANEL_ID,
} from './constants';
import { useDataStreamSelector } from './state_machine/use_data_stream_selector';
import { DataStreamsPopover } from './sub_components/data_streams_popover';
import { DataStreamSkeleton } from './sub_components/data_streams_skeleton';
import { SearchControls, useSearchStrategy } from './sub_components/search_controls';
import { PanelId, DataStreamSelectorProps } from './types';
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
  onSearch,
  onStreamSelected,
  onStreamsEntryClick,
  onStreamsReload,
  title,
}: DataStreamSelectorProps) {
  const { isOpen, togglePopover } = useDataStreamSelector();

  const [setSpyRef] = useIntersectionRef({ onIntersecting: onIntegrationsLoadMore });

  const [currentPanel, setCurrentPanel] = useState<PanelId>(INTEGRATION_PANEL_ID);

  const [search, handleSearch] = useSearchStrategy({ id: currentPanel, onSearch });

  const handlePanelChange = ({ panelId }: { panelId: EuiContextMenuPanelId }) => {
    setCurrentPanel(panelId as PanelId);
  };

  const handleStreamSelection = useCallback<DataStreamSelectionHandler>(
    (dataStream) => {
      onStreamSelected(dataStream);
      togglePopover();
    },
    [togglePopover, onStreamSelected]
  );

  const { items: integrationItems, panels: integrationPanels } = useMemo(() => {
    const dataStreamsItem = {
      name: uncategorizedLabel,
      onClick: onStreamsEntryClick,
      panel: UNCATEGORIZED_STREAMS_PANEL_ID,
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
      onStreamSelected: handleStreamSelection,
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
    handleStreamSelection,
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
      id: UNCATEGORIZED_STREAMS_PANEL_ID,
      title: uncategorizedLabel,
      width: DATA_VIEW_POPOVER_CONTENT_WIDTH,
      content: (
        <DataStreamsList
          onStreamClick={handleStreamSelection}
          dataStreams={dataStreams}
          error={dataStreamsError}
          isLoading={isLoadingStreams}
          onRetry={onStreamsReload}
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
          key={currentPanel}
          search={search}
          onSearch={handleSearch}
          isLoading={isLoadingIntegrations || isLoadingStreams}
        />
        <EuiHorizontalRule margin="none" />
        <EuiContextMenu
          initialPanelId={currentPanel}
          panels={panels}
          onPanelChange={handlePanelChange}
          className="eui-yScroll"
          css={contextMenuStyles}
        />
      </EuiContextMenuPanel>
    </DataStreamsPopover>
  );
}
