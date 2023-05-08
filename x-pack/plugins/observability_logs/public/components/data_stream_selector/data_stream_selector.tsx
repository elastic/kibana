/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiButton,
  EuiButtonProps,
  EuiContextMenu,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiHorizontalRule,
  EuiIcon,
  EuiPopover,
  useIsWithinBreakpoints,
} from '@elastic/eui';
import { PackageIcon } from '@kbn/fleet-plugin/public';

import { useBoolean } from '../../hooks/use_boolean';

import {
  DATA_VIEW_POPOVER_CONTENT_WIDTH,
  integrationsLabel,
  POPOVER_ID,
  selectViewLabel,
  uncategorizedLabel,
} from './constants';
import { getPopoverButtonStyles } from './data_stream_selector.utils';

export interface DataStreamSelectorProps {
  title: string;
  integrations: any[];
  uncategorizedStreams: any[];
  onStreamSelected: (dataStream: any) => Promise<void>;
  onUncategorizedClick: () => void;
}

export function DataStreamSelector({
  title,
  integrations,
  uncategorizedStreams,
  onStreamSelected,
  onUncategorizedClick,
}: DataStreamSelectorProps) {
  const isMobile = useIsWithinBreakpoints(['xs', 's']);
  const [isPopoverOpen, { off: closePopover, toggle: togglePopover }] = useBoolean(false);

  const handleStreamSelection = (dataStream) => {
    onStreamSelected(dataStream).then(closePopover);
  };

  const { items: integrationItems, panels: integrationPanels } = useMemo(
    () =>
      buildItemsTree({
        type: 'integration',
        list: integrations,
        onStreamSelected: handleStreamSelection,
      }),
    [integrations]
  );

  const { items: uncategorizedStreamsItems, panels: uncategorizedStreamsPanels } = useMemo(
    () =>
      buildItemsTree({
        type: 'uncategorizedStreams',
        list: uncategorizedStreams,
        onStreamSelected: handleStreamSelection,
      }),
    [uncategorizedStreams]
  );

  const panels = [
    {
      id: 0,
      width: DATA_VIEW_POPOVER_CONTENT_WIDTH,
      items: [
        {
          name: integrationsLabel,
          panel: 1,
        },
        {
          name: uncategorizedLabel,
          onClick: onUncategorizedClick,
          panel: 2,
        },
      ],
    },
    {
      id: 1,
      title: integrationsLabel,
      width: DATA_VIEW_POPOVER_CONTENT_WIDTH,
      items: integrationItems,
    },
    {
      id: 2,
      title: uncategorizedLabel,
      width: DATA_VIEW_POPOVER_CONTENT_WIDTH,
      items: uncategorizedStreamsItems,
    },
    ...integrationPanels,
    ...uncategorizedStreamsPanels,
  ];

  const contextPanelItems = [
    <SearchControls />,
    <EuiHorizontalRule margin="none" />,
    <EuiContextMenu initialPanelId={0} panels={panels} />,
  ];

  const button = (
    <DataStreamButton isAdHocSelected onClick={togglePopover} fullWidth={isMobile}>
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
      <EuiContextMenuPanel title={selectViewLabel} items={contextPanelItems} />
    </EuiPopover>
  );
}

interface DataStreamButtonProps extends EuiButtonProps {
  isAdHocSelected: boolean;
  onClick: () => void;
}

const DataStreamButton = ({
  children,
  isAdHocSelected = false,
  ...props
}: DataStreamButtonProps) => {
  const isMobile = useIsWithinBreakpoints(['xs', 's']);

  const buttonStyles = getPopoverButtonStyles({ fullWidth: isMobile });

  return (
    <EuiButton css={buttonStyles} iconType="arrowDown" iconSide="right" {...props}>
      {isAdHocSelected && <EuiIcon type="indexTemporary" />}
      <span className="eui-textTruncate">{children}</span>
    </EuiButton>
  );
};

const SearchControls = () => {
  return <EuiContextMenuItem>Here goes the search</EuiContextMenuItem>;
  // return (
  //   <EuiFlexGroup
  //     gutterSize="xs"
  //     direction="row"
  //     justifyContent="spaceBetween"
  //     alignItems="center"
  //     responsive={false}
  //   >
  //     <EuiFlexItem>{search}</EuiFlexItem>

  //     <EuiFlexItem grow={false}>
  //       <EuiButtonGroup
  //         isIconOnly
  //         buttonSize="compressed"
  //         options={sortOrderOptions}
  //         legend={strings.editorAndPopover.getSortDirectionLegend()}
  //         idSelected={sortingService.direction}
  //         onChange={onChangeSortDirection}
  //       />
  //     </EuiFlexItem>
  //   </EuiFlexGroup>
  // );
};

const buildItemsTree = ({ type, list, onStreamSelected }) => {
  const items = list.map((entry) => ({
    name: entry.name,
    icon: <PackageIcon packageName={entry.name} version={entry.version} size="m" />,
    panel: `${type}-${entry.name}`,
  }));

  const panels = list.map((entry) => ({
    id: `${type}-${entry.name}`,
    title: entry.name,
    items: entry.dataStreams.map((stream) => ({
      name: stream.name,
      onClick: () => onStreamSelected(stream),
    })),
  }));

  return { items, panels };
};
