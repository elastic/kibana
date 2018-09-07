/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiContextMenu, EuiContextMenuPanelDescriptor, EuiPopover } from '@elastic/eui';
import React from 'react';
import { InfraWaffleMapNode, InfraWaffleMapOptions } from '../../lib/lib';
import { getContainerLogsUrl, getHostLogsUrl, getPodLogsUrl } from '../../pages/link_to';

interface Props {
  options: InfraWaffleMapOptions;
  node: InfraWaffleMapNode;
  isPopoverOpen: boolean;
  closePopover: () => void;
}

export const NodeContextMenu: React.SFC<Props> = ({
  children,
  node,
  isPopoverOpen,
  closePopover,
}) => {
  // TODO: This needs to be change to be dynamic based on the options passed in.
  const nodeType = 'host';

  const nodeLogsUrl = getNodeLogsUrl(nodeType, node);

  const panels: EuiContextMenuPanelDescriptor[] = [
    {
      id: 0,
      title: '',
      items: [
        ...(nodeLogsUrl
          ? [
              {
                name: `View logs for this ${nodeType}`,
                href: nodeLogsUrl,
              },
            ]
          : []),
        {
          name: `View metrics for this ${nodeType}`,
          href: `#/metrics/${nodeType}/${node.name}`,
        },
        {
          name: `View APM Traces for this ${nodeType}`,
          href: `/app/apm`,
        },
      ],
    },
  ];

  return (
    <EuiPopover
      closePopover={closePopover}
      id={`${node.id}-popover`}
      isOpen={isPopoverOpen}
      button={children}
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
    case 'host':
      return getPodLogsUrl({ podId: lastPathSegment.value });
    default:
      return undefined;
  }
};
