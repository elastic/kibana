/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiContextMenu, EuiContextMenuPanelDescriptor, EuiPopover } from '@elastic/eui';
import React from 'react';
import { InfraOptions, InfraWaffleMapNode } from '../../lib/lib';

interface Props {
  options: InfraOptions;
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

  const panels: EuiContextMenuPanelDescriptor[] = [
    {
      id: 0,
      title: '',
      items: [
        {
          name: `View logs for this ${nodeType}`,
          href: `#/details?filter=${node.name}`,
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
