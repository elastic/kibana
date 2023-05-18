/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { RefCallback, useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiButton,
  EuiButtonGroup,
  EuiButtonProps,
  EuiContextMenu,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiContextMenuPanelDescriptor,
  EuiContextMenuPanelItemDescriptor,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPopover,
  useIsWithinBreakpoints,
} from '@elastic/eui';
import { PackageIcon } from '@kbn/fleet-plugin/public';

import { EuiContextMenuPanelId } from '@elastic/eui/src/components/context_menu/context_menu';
import { dynamic } from '../../../common/dynamic';
import {
  DATA_VIEW_POPOVER_CONTENT_WIDTH,
  INTEGRATION_PANEL_ID,
  POPOVER_ID,
  UNCATEGORIZED_STREAMS_PANEL_ID,
  contextMenuStyles,
  integrationsLabel,
  selectViewLabel,
  sortOptions,
  sortOrdersLabel,
  uncategorizedLabel,
} from './constants';
import { getPopoverButtonStyles } from './data_stream_selector.utils';

import { useBoolean } from '../../hooks/use_boolean';

import type { DataStream, Integration } from '../../../common/data_streams';
import {
  LoadMoreIntegrations,
  SearchIntegrations,
  SearchIntegrationsParams,
} from '../../hooks/use_integrations';
import { useIntersectionRef } from '../../hooks/use_intersection_ref';
import type { DataStreamSelectionHandler } from '../../customizations/custom_data_stream_selector';

/**
 * Lazy load hidden components
 */
const DataStreamsList = dynamic(() => import('./data_streams_list'));

export interface DataStreamSelectorProps {
  title: string;
  search: SearchIntegrationsParams;
  integrations: Integration[] | null;
  uncategorizedStreams: DataStream[] | null;
  dataStreamsError: Error | null;
  isLoadingIntegrations: boolean;
  isLoadingStreams: boolean;
  /* Triggered when a search or sorting is performed on integrations */
  onSearchIntegrations: SearchIntegrations;
  /* Triggered when we reach the bottom of the integration list and want to load more */
  onLoadMoreIntegrations: LoadMoreIntegrations;
  /* Triggered when the uncategorized streams entry is selected */
  onStreamsEntryClick: () => void;
  /* Triggered when retrying to load the data streams */
  onStreamsReload: () => void;
  /* Triggered when a data stream entry is selected */
  onStreamSelected: DataStreamSelectionHandler;
}

type CurrentPanelId =
  | typeof INTEGRATION_PANEL_ID
  | typeof UNCATEGORIZED_STREAMS_PANEL_ID
  | `integration-${string}`;

export function DataStreamSelector({
  title,
  integrations,
  uncategorizedStreams,
  dataStreamsError,
  isLoadingIntegrations,
  isLoadingStreams,
  onSearchIntegrations,
  onLoadMoreIntegrations,
  onStreamSelected,
  onStreamsEntryClick,
  onStreamsReload,
  search,
}: DataStreamSelectorProps) {
  const isMobile = useIsWithinBreakpoints(['xs', 's']);
  const [isPopoverOpen, { off: closePopover, toggle: togglePopover }] = useBoolean(false);

  const [loadMoreIntersection, setRef] = useIntersectionRef();

  useEffect(() => {
    if (loadMoreIntersection?.isIntersecting) {
      onLoadMoreIntegrations();
    }
  }, [loadMoreIntersection, onLoadMoreIntegrations]);

  const [currentPanel, setCurrentPanel] = useState<CurrentPanelId>(INTEGRATION_PANEL_ID);

  const handlePanelChange = ({ panelId }: { panelId: EuiContextMenuPanelId }) => {
    setCurrentPanel(panelId as CurrentPanelId);
  };

  const handleStreamSelection = useCallback<DataStreamSelectionHandler>(
    (dataStream) => {
      onStreamSelected(dataStream);
      closePopover();
    },
    [closePopover, onStreamSelected]
  );

  const { items: integrationItems, panels: integrationPanels } = useMemo(() => {
    const uncategorizedStreamsItem = {
      name: uncategorizedLabel,
      onClick: onStreamsEntryClick,
      panel: UNCATEGORIZED_STREAMS_PANEL_ID,
    };

    if (!integrations) {
      return {
        items: [uncategorizedStreamsItem],
        panels: [],
      };
    }

    const { items, panels } = buildIntegrationsTree({
      list: integrations,
      onStreamSelected: handleStreamSelection,
      spyRef: setRef,
    });

    return {
      items: [uncategorizedStreamsItem, ...items],
      panels,
    };
  }, [integrations, handleStreamSelection, onStreamsEntryClick, setRef]);

  const [localSearch, setLocalSearch] = useState<SearchIntegrationsParams>({
    sortOrder: 'asc',
    name: '',
  });

  const filteredIntegrationPanels = integrationPanels.map((panel) => {
    if (panel.id !== currentPanel) {
      return panel;
    }

    return {
      ...panel,
      items: applyStreamSearch(panel.items, localSearch),
    };
  });

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
          dataStreams={uncategorizedStreams}
          error={dataStreamsError}
          isLoading={isLoadingStreams}
          onRetry={onStreamsReload}
          onStreamClick={handleStreamSelection}
        />
      ),
    },
    ...filteredIntegrationPanels,
  ];

  const button = (
    <DataStreamButton onClick={togglePopover} fullWidth={isMobile}>
      {title}
    </DataStreamButton>
  );

  const handleIntegrationStreamsSearch = setLocalSearch;

  // TODO: Handle search strategy by current panel id
  const handleSearch =
    currentPanel === INTEGRATION_PANEL_ID ? onSearchIntegrations : handleIntegrationStreamsSearch;
  const searchValue = currentPanel === INTEGRATION_PANEL_ID ? search : localSearch;

  return (
    <EuiPopover
      id={POPOVER_ID}
      button={button}
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      {...(isMobile && { display: 'block' })}
      buffer={8}
    >
      <EuiContextMenuPanel title={selectViewLabel}>
        <SearchControls
          search={searchValue}
          onSearch={handleSearch}
          isLoading={isLoadingIntegrations}
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
    </EuiPopover>
  );
}

interface DataStreamButtonProps extends EuiButtonProps {
  onClick: () => void;
}

const DataStreamButton = (props: DataStreamButtonProps) => {
  const buttonStyles = getPopoverButtonStyles({ fullWidth: props.fullWidth });

  return <EuiButton css={buttonStyles} iconType="arrowDown" iconSide="right" {...props} />;
};

interface SearchControlsProps {
  isLoading: boolean;
  search: SearchIntegrationsParams;
  onSearch: SearchIntegrations;
}

const SearchControls = ({ search, onSearch, isLoading }: SearchControlsProps) => {
  const handleQueryChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    const name = event.target.value;
    onSearch({ ...search, name });
  };

  const handleSortChange = (id: string) => {
    onSearch({ ...search, sortOrder: id as SearchIntegrationsParams['sortOrder'] });
  };

  return (
    <EuiContextMenuItem disabled css={{ width: DATA_VIEW_POPOVER_CONTENT_WIDTH }}>
      <EuiFlexGroup gutterSize="xs" responsive={false}>
        <EuiFlexItem>
          <EuiFieldSearch
            compressed
            incremental
            onChange={handleQueryChange}
            isLoading={isLoading}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonGroup
            isIconOnly
            buttonSize="compressed"
            options={sortOptions}
            legend={sortOrdersLabel}
            idSelected={search.sortOrder}
            onChange={handleSortChange}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiContextMenuItem>
  );
};

interface IntegrationsTree {
  items: EuiContextMenuPanelItemDescriptor[];
  panels: EuiContextMenuPanelDescriptor[];
}

interface IntegrationsTreeParams {
  list: Integration[];
  onStreamSelected: DataStreamSelectionHandler;
  spyRef: RefCallback<HTMLButtonElement>;
}

const applyStreamSearch = (streams: DataStream[], search: SearchIntegrationsParams) => {
  const { name, sortOrder } = search;

  const filteredStreams = streams.filter((stream) => stream.name.includes(name ?? ''));

  const sortedStreams = filteredStreams.sort((curr, next) => curr.name.localeCompare(next.name));

  const searchResult = sortOrder === 'asc' ? sortedStreams : sortedStreams.reverse();

  return searchResult;
};

const buildIntegrationsTree = ({ list, onStreamSelected, spyRef }: IntegrationsTreeParams) => {
  return list.reduce(
    (res: IntegrationsTree, entry, pos) => {
      const entryId: CurrentPanelId = `integration-${entry.name}`;

      res.items.push({
        name: entry.name,
        icon: <PackageIcon packageName={entry.name} version={entry.version} size="m" tryApi />,
        panel: entryId,
        buttonRef: pos === list.length - 1 ? spyRef : undefined,
      });

      res.panels.push({
        id: entryId,
        title: entry.name,
        width: DATA_VIEW_POPOVER_CONTENT_WIDTH,
        items: entry.dataStreams.map((stream) => ({
          name: stream.name,
          onClick: () =>
            onStreamSelected({ title: stream.title, name: `[${entry.name}] ${stream.name}` }),
        })),
      });

      return res;
    },
    { items: [], panels: [] }
  );
};
