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
import { getIntegrationId, IntegrationId, SortOrder } from '../../../common';
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

import { DataStream, Integration, SearchStrategy } from '../../../common/data_streams';
import { LoadMoreIntegrations } from '../../hooks/use_integrations';
import { useIntersectionRef } from '../../hooks/use_intersection_ref';
import type { DataStreamSelectionHandler } from '../../customizations/custom_data_stream_selector';
import { DataStreamSkeleton } from './data_stream_skeleton';

/**
 * Lazy load hidden components
 */
const DataStreamsList = dynamic(() => import('./data_streams_list'), {
  fallback: <DataStreamSkeleton />,
});

type CurrentPanelId =
  | typeof INTEGRATION_PANEL_ID
  | typeof UNCATEGORIZED_STREAMS_PANEL_ID
  | IntegrationId;

export interface SearchParams {
  name?: string;
  sortOrder?: SortOrder;
  strategy: SearchStrategy;
  integrationId?: CurrentPanelId;
}

type PartialSearchParams = Pick<SearchParams, 'name' | 'sortOrder'>;

export type SearchHandler = (params: SearchParams) => void;

export interface DataStreamSelectorProps {
  title: string;
  search: PartialSearchParams;
  integrations: Integration[] | null;
  dataStreams: DataStream[] | null;
  dataStreamsError?: Error | null;
  isLoadingIntegrations: boolean;
  isLoadingStreams: boolean;
  /* Triggered when a search or sorting is performed on integrations */
  onSearch: SearchHandler;
  /* Triggered when we reach the bottom of the integration list and want to load more */
  onIntegrationsLoadMore: LoadMoreIntegrations;
  /* Triggered when the uncategorized streams entry is selected */
  onStreamsEntryClick: () => void;
  /* Triggered when retrying to load the data streams */
  onStreamsReload: () => void;
  /* Triggered when a data stream entry is selected */
  onStreamSelected: DataStreamSelectionHandler;
}

export function DataStreamSelector({
  title,
  integrations,
  isLoadingIntegrations,
  onSearch,
  onIntegrationsLoadMore,
  onStreamSelected,
  search,
  dataStreamsError,
  isLoadingStreams,
  onStreamsEntryClick,
  onStreamsReload,
  dataStreams,
}: DataStreamSelectorProps) {
  const isMobile = useIsWithinBreakpoints(['xs', 's']);
  const [isPopoverOpen, { off: closePopover, toggle: togglePopover }] = useBoolean(false);

  const [loadMoreIntersection, setSpyRef] = useIntersectionRef();

  useEffect(() => {
    if (loadMoreIntersection?.isIntersecting) {
      onIntegrationsLoadMore();
    }
  }, [loadMoreIntersection, onIntegrationsLoadMore]);

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
    const dataStreamsItem = {
      name: uncategorizedLabel,
      onClick: onStreamsEntryClick,
      panel: UNCATEGORIZED_STREAMS_PANEL_ID,
    };

    if (!integrations) {
      return {
        items: [dataStreamsItem],
        panels: [],
      };
    }

    const { items, panels } = buildIntegrationsTree({
      integrations,
      onStreamSelected: handleStreamSelection,
    });

    setIntegrationListSpy(items, setSpyRef);

    return {
      items: [dataStreamsItem, ...items],
      panels,
    };
  }, [integrations, handleStreamSelection, onStreamsEntryClick, setSpyRef]);

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

  const button = (
    <DataStreamButton onClick={togglePopover} fullWidth={isMobile}>
      {title}
    </DataStreamButton>
  );

  const handleSearch = (params: PartialSearchParams) => {
    const strategy = getSearchStrategy(currentPanel);
    return onSearch({
      ...params,
      strategy,
      ...(strategy === SearchStrategy.INTEGRATIONS_DATA_STREAMS && { integrationId: currentPanel }),
    });
  };
  const searchValue = search;

  return (
    <EuiPopover
      id={POPOVER_ID}
      button={button}
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      buffer={8}
      {...(isMobile && { display: 'block' })}
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
  search: PartialSearchParams;
  onSearch: (params: PartialSearchParams) => void;
}

const SearchControls = ({ search, onSearch, isLoading }: SearchControlsProps) => {
  const handleQueryChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    const name = event.target.value;
    onSearch({ ...search, name });
  };

  const handleSortChange = (id: string) => {
    onSearch({ ...search, sortOrder: id as SearchParams['sortOrder'] });
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
            idSelected={search.sortOrder as SortOrder}
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
  integrations: Integration[];
  onStreamSelected: DataStreamSelectionHandler;
}

const buildIntegrationsTree = ({ integrations, onStreamSelected }: IntegrationsTreeParams) => {
  return integrations.reduce(
    (res: IntegrationsTree, integration) => {
      const entryId: CurrentPanelId = getIntegrationId(integration);
      const { name, version, dataStreams } = integration;

      res.items.push({
        name,
        icon: <PackageIcon packageName={name} version={version} size="m" tryApi />,
        panel: entryId,
      });

      res.panels.push({
        id: entryId,
        title: name,
        width: DATA_VIEW_POPOVER_CONTENT_WIDTH,
        items: dataStreams.map((stream) => ({
          name: stream.title,
          onClick: () =>
            onStreamSelected({ title: `[${name}] ${stream.title}`, name: stream.name }),
        })),
      });

      return res;
    },
    { items: [], panels: [] }
  );
};

const setIntegrationListSpy = (
  items: EuiContextMenuPanelItemDescriptor[],
  spyRef: RefCallback<HTMLButtonElement>
) => {
  const lastItem = items.at(-1);
  if (lastItem) {
    lastItem.buttonRef = spyRef;
  }
};

const getSearchStrategy = (panelId: CurrentPanelId) => {
  if (panelId === UNCATEGORIZED_STREAMS_PANEL_ID) return SearchStrategy.DATA_STREAMS;
  if (panelId === INTEGRATION_PANEL_ID) return SearchStrategy.INTEGRATIONS;
  return SearchStrategy.INTEGRATIONS_DATA_STREAMS;
};
