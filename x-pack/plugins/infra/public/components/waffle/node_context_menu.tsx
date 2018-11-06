/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiContextMenu, EuiContextMenuPanelDescriptor, EuiPopover } from '@elastic/eui';
import { InjectedIntl, injectI18n } from '@kbn/i18n/react';
import React from 'react';

import { InfraNodeType, InfraTimerangeInput } from '../../../common/graphql/types';
import { InfraWaffleMapNode, InfraWaffleMapOptions } from '../../lib/lib';
import { getNodeDetailUrl, getNodeLogsUrl } from '../../pages/link_to';

interface Props {
  options: InfraWaffleMapOptions;
  timeRange: InfraTimerangeInput;
  node: InfraWaffleMapNode;
  nodeType: InfraNodeType;
  isPopoverOpen: boolean;
  closePopover: () => void;
  intl: InjectedIntl;
}

const NodeContextMenuUI: React.SFC<Props> = ({
  options,
  timeRange,
  children,
  node,
  isPopoverOpen,
  closePopover,
  nodeType,
  intl,
}) => {
  const nodeName = node.path.length > 0 ? node.path[node.path.length - 1].value : undefined;
  const nodeLogsUrl = nodeName
    ? getNodeLogsUrl({
        nodeType,
        nodeName,
        time: timeRange.to,
      })
    : undefined;
  const nodeDetailUrl = nodeName
    ? getNodeDetailUrl({
        nodeType,
        nodeName,
        from: timeRange.from,
        to: timeRange.to,
      })
    : undefined;

  const panels: EuiContextMenuPanelDescriptor[] = [
    {
      id: 0,
      title: '',
      items: [
        ...(nodeLogsUrl
          ? [
              {
                name: intl.formatMessage({
                  id: 'xpack.infra.nodeContextMenu.viewLogsName',
                  defaultMessage: 'View logs',
                }),
                href: nodeLogsUrl,
              },
            ]
          : []),
        ...(nodeDetailUrl
          ? [
              {
                name: intl.formatMessage({
                  id: 'xpack.infra.nodeContextMenu.viewMetricsName',
                  defaultMessage: 'View metrics',
                }),
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

export const NodeContextMenu = injectI18n(NodeContextMenuUI);
