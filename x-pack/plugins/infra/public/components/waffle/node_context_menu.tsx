/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiContextMenu, EuiContextMenuPanelDescriptor, EuiPopover } from '@elastic/eui';
import React from 'react';
import { InfraNodeType } from '../../../common/graphql/types';
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
  node: InfraWaffleMapNode;
  nodeType: InfraNodeType;
  isPopoverOpen: boolean;
  closePopover: () => void;
}

export const NodeContextMenu: React.SFC<Props> = ({
  options,
  children,
  node,
  isPopoverOpen,
  closePopover,
  nodeType,
}) => {
  const nodeLogsUrl = getNodeLogsUrl(nodeType, node);
  const nodeDetailUrl = getNodeDetailUrl(nodeType, node);
  const nodeField = options.fields ? options.fields[nodeType] : null;
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
        ...(nodeField
          ? [
              {
                name: `View APM Traces`,
                href: `../app/apm#/?_g=()&kuery=${nodeField}~20~3A~20~22${node.name}~22`,
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
  { path }: InfraWaffleMapNode
): string | undefined => {
  if (path.length <= 0) {
    return undefined;
  }

  const lastPathSegment = path[path.length - 1];

  switch (nodeType) {
    case 'host':
      return getHostLogsUrl({ hostname: lastPathSegment.value });
    case 'container':
      return getContainerLogsUrl({ containerId: lastPathSegment.value });
    case 'pod':
      return getPodLogsUrl({ podId: lastPathSegment.value });
    default:
      return undefined;
  }
};

const getNodeDetailUrl = (
  nodeType: 'host' | 'container' | 'pod',
  { path }: InfraWaffleMapNode
): string | undefined => {
  if (path.length <= 0) {
    return undefined;
  }

  const lastPathSegment = path[path.length - 1];

  switch (nodeType) {
    case 'host':
      return getHostDetailUrl({ name: lastPathSegment.value });
    case 'container':
      return getContainerDetailUrl({ name: lastPathSegment.value });
    case 'pod':
      return getPodDetailUrl({ name: lastPathSegment.value });
    default:
      return undefined;
  }
};
