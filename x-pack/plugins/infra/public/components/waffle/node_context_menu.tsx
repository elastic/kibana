/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiContextMenu, EuiContextMenuPanelDescriptor, EuiPopover } from '@elastic/eui';
import { InjectedIntl, injectI18n } from '@kbn/i18n/react';
import React from 'react';
import { UICapabilities } from 'ui/capabilities';
import { injectUICapabilities } from 'ui/capabilities/react';
import { InfraNodeType, InfraTimerangeInput } from '../../graphql/types';
import { InfraWaffleMapNode, InfraWaffleMapOptions } from '../../lib/lib';
import { getNodeDetailUrl, getNodeLogsUrl } from '../../pages/link_to';

interface Props {
  options: InfraWaffleMapOptions;
  timeRange: InfraTimerangeInput;
  children: any;
  node: InfraWaffleMapNode;
  nodeType: InfraNodeType;
  isPopoverOpen: boolean;
  closePopover: () => void;
  intl: InjectedIntl;
  uiCapabilities: UICapabilities;
}

export const NodeContextMenu = injectUICapabilities(
  injectI18n(
    ({
      options,
      timeRange,
      children,
      node,
      isPopoverOpen,
      closePopover,
      nodeType,
      intl,
      uiCapabilities,
    }: Props) => {
      // Due to the changing nature of the fields between APM and this UI,
      // We need to have some exceptions until 7.0 & ECS is finalized. Reference
      // #26620 for the details for these fields.
      // TODO: This is tech debt, remove it after 7.0 & ECS migration.
      const APM_FIELDS = {
        [InfraNodeType.host]: 'host.hostname',
        [InfraNodeType.container]: 'container.id',
        [InfraNodeType.pod]: 'kubernetes.pod.uid',
      };

      const nodeLogsUrl =
        node.id && uiCapabilities.logs.show
          ? getNodeLogsUrl({
              nodeType,
              nodeId: node.id,
              time: timeRange.to,
            })
          : undefined;
      const nodeDetailUrl = node.id
        ? getNodeDetailUrl({
            nodeType,
            nodeId: node.id,
            from: timeRange.from,
            to: timeRange.to,
          })
        : undefined;

      const apmTracesUrl =
        uiCapabilities.apm && uiCapabilities.apm.show
          ? {
              name: intl.formatMessage(
                {
                  id: 'xpack.infra.nodeContextMenu.viewAPMTraces',
                  defaultMessage: 'View {nodeType} APM traces',
                },
                { nodeType }
              ),
              href: `../app/apm#/traces?_g=()&kuery=${APM_FIELDS[nodeType]}~20~3A~20~22${
                node.id
              }~22`,
              'data-test-subj': 'viewApmTracesContextMenuItem',
            }
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
                    'data-test-subj': 'viewLogsContextMenuItem',
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
            ...(apmTracesUrl ? [apmTracesUrl] : []),
          ],
        },
      ];

      return (
        <EuiPopover
          closePopover={closePopover}
          id={`${node.pathId}-popover`}
          isOpen={isPopoverOpen}
          button={children}
          panelPaddingSize="none"
        >
          <EuiContextMenu initialPanelId={0} panels={panels} data-test-subj="nodeContextMenu" />
        </EuiPopover>
      );
    }
  )
);
