/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
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

import { i18n } from '@kbn/i18n';

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

import type { DataStream, Integration } from '../../../common/integrations';
export interface DataStreamSelectorProps {
  title: string;
  integrations: any[];
  uncategorizedStreams: any[];
  onStreamSelected: (dataStream: any) => Promise<void>;
  onUncategorizedClick: () => void;
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
  onStreamSelected,
  onUncategorizedClick,
}: DataStreamSelectorProps) {
  const isMobile = useIsWithinBreakpoints(['xs', 's']);
  const [isPopoverOpen, { off: closePopover, toggle: togglePopover }] = useBoolean(false);

  const [currentPanel, setCurrentPanel] = useState<CurrentPanelId>(INTEGRATION_PANEL_ID);

  const { items: integrationItems, panels: integrationPanels } = useMemo(() => {
    const handleStreamSelection: StreamSelectionHandler = (dataStream) => {
      onStreamSelected(dataStream).then(closePopover);
    };

    return buildIntegrationsTree({
      list: integrations,
      onItemClick: setCurrentPanel,
      onStreamSelected: handleStreamSelection,
    });
  }, [closePopover, integrations, onStreamSelected]);

  const panels = [
    {
      id: INTEGRATION_PANEL_ID,
      title: integrationsLabel,
      width: DATA_VIEW_POPOVER_CONTENT_WIDTH,
      items: [
        {
          name: uncategorizedLabel,
          onClick: onUncategorizedClick,
          panel: UNCATEGORIZED_STREAMS_PANEL_ID,
        },
        ...integrationItems,
      ],
    },
    {
      id: UNCATEGORIZED_STREAMS_PANEL_ID,
      title: uncategorizedLabel,
      width: DATA_VIEW_POPOVER_CONTENT_WIDTH,
      items: uncategorizedStreams.map((stream) => ({
        name: stream.name,
        onClick: () => onStreamSelected(stream),
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
      <EuiContextMenuPanel title={selectViewLabel} onTransitionComplete={console.log}>
        <SearchControls />
        <EuiHorizontalRule margin="none" />
        <EuiContextMenu
          initialPanelId={currentPanel}
          panels={panels}
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

type SearchStrategy = 'integrations' | 'integrationsStreams' | 'uncategorizedStreams';

interface SearchControlsProps {
  strategy: SearchStrategy;
}

const SearchControls = ({ strategy }: SearchControlsProps) => {
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

interface IntegrationsTree {
  items: EuiContextMenuPanelItemDescriptor[];
  panels: EuiContextMenuPanelDescriptor[];
}

interface IntegrationsTreeParams {
  list: Integration[];
  onItemClick: (id: CurrentPanelId) => void;
  onStreamSelected: StreamSelectionHandler;
}

const buildIntegrationsTree = ({ list, onItemClick, onStreamSelected }: IntegrationsTreeParams) => {
  return list.reduce(
    (res: IntegrationsTree, entry) => {
      const entryId: CurrentPanelId = `integration-${entry.name}`;

      res.items.push({
        name: entry.name,
        onClick: () => onItemClick(entryId),
        icon: <PackageIcon packageName={entry.name} version={entry.version} size="m" />,
        panel: entryId,
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
