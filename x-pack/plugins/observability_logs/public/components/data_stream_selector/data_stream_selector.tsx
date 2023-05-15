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
  EuiPanel,
  EuiPopover,
  EuiSkeletonLoading,
  EuiSkeletonText,
  EuiSkeletonTitle,
  useIsWithinBreakpoints,
} from '@elastic/eui';
import { PackageIcon } from '@kbn/fleet-plugin/public';

import useIntersection from 'react-use/lib/useIntersection';
import {
  contextMenuStyles,
  DATA_VIEW_POPOVER_CONTENT_WIDTH,
  integrationsLabel,
  INTEGRATION_PANEL_ID,
  POPOVER_ID,
  selectViewLabel,
  sortDirectionsLabel,
  uncategorizedLabel,
  UNCATEGORIZED_STREAMS_PANEL_ID,
} from './constants';
import { getPopoverButtonStyles } from './data_stream_selector.utils';

import { useBoolean } from '../../hooks/use_boolean';

import type { DataStream, Integration } from '../../../common/data_streams';
import { LoadMoreIntegrations, SearchIntegrations } from '../../hooks/use_integrations';
export interface DataStreamSelectorProps {
  title: string;
  integrations: Integration[] | null;
  uncategorizedStreams: any[];
  isSearching: boolean;
  isLoadingIntegrations: boolean;
  isLoadingMoreIntegrations: boolean;
  isLoadingUncategorizedStreams: boolean;
  /* Triggered when a search or sorting is performed */
  onSearch: SearchIntegrations;
  /* Triggered when we reach the bottom of the integration list and want to load more */
  onLoadMore: LoadMoreIntegrations;
  /* Triggered when the uncategorized streams entry is selected */
  onUncategorizedClick: () => void;
  /* Triggered when a data stream entry is selected */
  onStreamSelected: (dataStream: any) => Promise<void>;
}

type CurrentPanelId =
  | typeof INTEGRATION_PANEL_ID
  | typeof UNCATEGORIZED_STREAMS_PANEL_ID
  | `integration-${string}`;

type StreamSelectionHandler = (stream: DataStream) => void;

export function DataStreamSelector({
  title,
  integrations,
  uncategorizedStreams,
  isSearching,
  isLoadingIntegrations,
  isLoadingMoreIntegrations,
  isLoadingUncategorizedStreams,
  onSearch,
  onLoadMore,
  onStreamSelected,
  onUncategorizedClick,
}: DataStreamSelectorProps) {
  const isMobile = useIsWithinBreakpoints(['xs', 's']);
  const [isPopoverOpen, { off: closePopover, toggle: togglePopover }] = useBoolean(false);

  const [loadMoreSpyRef, setRef] = useState<HTMLButtonElement | null>(null);

  const loadMoreSpyIntersection = useIntersection(
    { current: loadMoreSpyRef },
    { root: null, threshold: 0.5 }
  );

  useEffect(() => {
    if (loadMoreSpyIntersection?.isIntersecting) {
      onLoadMore();
    }
  }, [loadMoreSpyIntersection, onLoadMore]);

  const [currentPanel, setCurrentPanel] = useState<CurrentPanelId>(INTEGRATION_PANEL_ID);

  const handlePanelChange = ({ panelId }: { panelId: CurrentPanelId }) => {
    setCurrentPanel(panelId);
  };

  const handleStreamSelection = useCallback<StreamSelectionHandler>(
    (dataStream) => {
      onStreamSelected(dataStream);
      closePopover();
    },
    [closePopover, onStreamSelected]
  );

  const { items: integrationItems, panels: integrationPanels } = useMemo(() => {
    const uncategorizedStreamsItem = {
      name: uncategorizedLabel,
      onClick: onUncategorizedClick,
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
  }, [integrations, handleStreamSelection, onUncategorizedClick]);

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
      items: isLoadingUncategorizedStreams
        ? []
        : uncategorizedStreams.map((stream) => ({
            name: stream.name,
            onClick: () => handleStreamSelection(stream),
          })),
    },
    ...integrationPanels,
  ];

  const button = (
    <DataStreamButton onClick={togglePopover} fullWidth={isMobile}>
      {title}
    </DataStreamButton>
  );

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
        <SearchControls isSearching={isSearching} onSearch={onSearch} />
        <EuiHorizontalRule margin="none" />
        <ContextMenuSkeleton isLoading={isLoadingIntegrations}>
          <EuiContextMenu
            initialPanelId={currentPanel}
            panels={panels}
            // onPanelChange={handlePanelChange}
            className="eui-yScroll"
            css={contextMenuStyles}
          />
        </ContextMenuSkeleton>
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

type SearchStrategy = 'integrations' | 'integrationsStreams' | 'uncategorizedStreams';

interface SearchControlsProps {
  isSearching: boolean;
  onSearch: () => void;
}

const SearchControls = ({ isSearching, onSearch }: SearchControlsProps) => {
  /**
   * TODO: implement 3 different search strategies
   * - Search integrations: API request
   * - Search integrations streams: in memory sorting
   * - Search uncategorized streams: API request
   */
  // const { search, searchByText, sortByDirection, isSearching } = useSearch(strategy);

  return (
    <EuiContextMenuItem disabled css={{ width: DATA_VIEW_POPOVER_CONTENT_WIDTH }}>
      <EuiFlexGroup gutterSize="xs" responsive={false}>
        <EuiFlexItem>
          <EuiFieldSearch
            compressed
            incremental
            isLoading={isSearching}
            // onChange={searchByText} isLoading={isSearching}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonGroup
            isIconOnly
            buttonSize="compressed"
            options={[
              {
                id: 'asc',
                iconType: 'sortAscending',
                label: 'Ascending',
              },
              {
                id: 'desc',
                iconType: 'sortDescending',
                label: 'Descending',
              },
            ]}
            legend={sortDirectionsLabel}
            // idSelected={search.sortingDirection}
            // onChange={sortByDirection}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiContextMenuItem>
  );
};

const ContextMenuSkeleton = ({ children, isLoading }) => {
  return (
    <EuiSkeletonLoading
      isLoading={isLoading}
      contentAriaLabel={integrationsLabel}
      loadingContent={
        <EuiPanel>
          <EuiFlexGroup direction="column" gutterSize="s">
            <EuiFlexItem>
              <EuiSkeletonTitle size="xs" />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiSkeletonText lines={5} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      }
      loadedContent={children}
    />
  );
};

interface IntegrationsTree {
  items: EuiContextMenuPanelItemDescriptor[];
  panels: EuiContextMenuPanelDescriptor[];
}

interface IntegrationsTreeParams {
  list: Integration[];
  onStreamSelected: StreamSelectionHandler;
  spyRef: RefCallback<HTMLButtonElement>;
}

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
          onClick: () => onStreamSelected(stream),
        })),
      });

      return res;
    },
    { items: [], panels: [] }
  );
};
