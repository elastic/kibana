/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiContextMenu, EuiContextMenuPanelDescriptor, EuiPopover } from '@elastic/eui';
import React from 'react';
import { InfraNodeType, InfraTimerangeInput } from '../../../common/graphql/types';
import { InfraWaffleMapNode, InfraWaffleMapOptions } from '../../lib/lib';
import {
  getContainerDetailUrl,
  getContainerLogsUrl,
  getHostDetailUrl,
  getHostLogsUrl,
  getPodDetailUrl,
  getPodLogsUrl,
} from '../../pages/link_to';

interface Props {
  options: InfraWaffleMapOptions;
  timeRange: InfraTimerangeInput;
  node: InfraWaffleMapNode;
  nodeType: InfraNodeType;
  isPopoverOpen: boolean;
  closePopover: () => void;
}

export const NodeContextMenu: React.SFC<Props> = ({
  options,
  timeRange,
  children,
  node,
  isPopoverOpen,
  closePopover,
  nodeType,
}) => {
  const nodeDetailUrl = getNodeDetailUrl(nodeType, node, timeRange);
  const nodeLogsUrl = getNodeLogsUrl(nodeType, node, timeRange.to);
  const panels: EuiContextMenuPanelDescriptor[] = [
    {
      id: 0,
      title: '',
      items: [
        ...(nodeLogsUrl
          ? [
              {
                name: `View logs`,
                href: nodeLogsUrl,
              },
            ]
          : []),
        ...(nodeDetailUrl
          ? [
              {
                name: `View metrics`,
                href: nodeDetailUrl,
              },
            ]
          : []),
      ],
    },
  ];

  return (
    <EuiPopover
      closePopover={closePopover}
      id={`${node.id}-popover`}
      isOpen={isPopoverOpen}
      button={children}
      panelPaddingSize="none"
    >
      <EuiContextMenu initialPanelId={0} panels={panels} />
    </EuiPopover>
  );
};

const getNodeLogsUrl = (
  nodeType: 'host' | 'container' | 'pod',
  { path }: InfraWaffleMapNode,
  time: number
): string | undefined => {
  if (path.length <= 0) {
    return undefined;
  }

  const lastPathSegment = path[path.length - 1];

  switch (nodeType) {
    case 'host':
      return getHostLogsUrl({ hostname: lastPathSegment.value, time });
    case 'container':
      return getContainerLogsUrl({ containerId: lastPathSegment.value, time });
    case 'pod':
      return getPodLogsUrl({ podId: lastPathSegment.value, time });
    default:
      return undefined;
  }
};

const getNodeDetailUrl = (
  nodeType: 'host' | 'container' | 'pod',
  { path }: InfraWaffleMapNode,
  { from, to }: InfraTimerangeInput
): string | undefined => {
  if (path.length <= 0) {
    return undefined;
  }

  const lastPathSegment = path[path.length - 1];

  switch (nodeType) {
    case 'host':
      return getHostDetailUrl({ name: lastPathSegment.value, from, to });
    case 'container':
      return getContainerDetailUrl({ name: lastPathSegment.value, from, to });
    case 'pod':
      return getPodDetailUrl({ name: lastPathSegment.value, from, to });
    default:
      return undefined;
  }
};
