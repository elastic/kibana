/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiContextMenu,
  EuiContextMenuPanelDescriptor,
  EuiPopover,
  EuiPopoverProps,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import React, { useCallback } from 'react';
import { InfraWaffleMapNode, InfraWaffleMapOptions } from '../../lib/lib';
import { getNodeDetailUrl, getNodeLogsUrl } from '../../pages/link_to';
import { createUptimeLink } from './lib/create_uptime_link';
import { findInventoryModel } from '../../../common/inventory_models';
import { useKibana } from '../../../../../../src/plugins/kibana_react/public';
import { InventoryItemType } from '../../../common/inventory_models/types';

interface Props {
  options: InfraWaffleMapOptions;
  currentTime: number;
  children: any;
  node: InfraWaffleMapNode;
  nodeType: InventoryItemType;
  isPopoverOpen: boolean;
  closePopover: () => void;
  popoverPosition: EuiPopoverProps['anchorPosition'];
}

export const NodeContextMenu = ({
  options,
  currentTime,
  children,
  node,
  isPopoverOpen,
  closePopover,
  nodeType,
  popoverPosition,
}: Props) => {
  const uiCapabilities = useKibana().services.application?.capabilities;
  const getUrlForApp = useKibana().services.application?.getUrlForApp;
  const prependBasePath = useKibana().services.http?.basePath.prepend;
  const prefixPathWithBasePath = useCallback(
    (path?: string, app?: string) => {
      if (!getUrlForApp || !prependBasePath) {
        return;
      }
      return prependBasePath(getUrlForApp(app ? app : 'infra', { path }));
    },
    [getUrlForApp, prependBasePath]
  );
  const inventoryModel = findInventoryModel(nodeType);
  // Due to the changing nature of the fields between APM and this UI,
  // We need to have some exceptions until 7.0 & ECS is finalized. Reference
  // #26620 for the details for these fields.
  // TODO: This is tech debt, remove it after 7.0 & ECS migration.
  const apmField = nodeType === 'host' ? 'host.hostname' : inventoryModel.fields.id;

  const nodeLogsMenuItem = {
    name: i18n.translate('xpack.infra.nodeContextMenu.viewLogsName', {
      defaultMessage: 'View logs',
    }),
    href: getNodeLogsUrl({
      nodeType,
      nodeId: node.id,
      time: currentTime,
      prefixPathWithBasePath,
    }),
    'data-test-subj': 'viewLogsContextMenuItem',
  };

  const nodeDetailFrom = currentTime - inventoryModel.metrics.defaultTimeRangeInSeconds * 1000;
  const nodeDetailMenuItem = {
    name: i18n.translate('xpack.infra.nodeContextMenu.viewMetricsName', {
      defaultMessage: 'View metrics',
    }),
    href: getNodeDetailUrl({
      nodeType,
      nodeId: node.id,
      from: nodeDetailFrom,
      to: currentTime,
      prefixPathWithBasePath,
    }),
  };

  const apmTracesMenuItem = {
    name: i18n.translate('xpack.infra.nodeContextMenu.viewAPMTraces', {
      defaultMessage: 'View APM traces',
    }),
    href: prefixPathWithBasePath(`#traces?_g=()&kuery=${apmField}:"${node.id}"`, 'apm'),
    'data-test-subj': 'viewApmTracesContextMenuItem',
  };

  const uptimeMenuItem = {
    name: i18n.translate('xpack.infra.nodeContextMenu.viewUptimeLink', {
      defaultMessage: 'View in Uptime',
    }),
    href: createUptimeLink(options, nodeType, node, prefixPathWithBasePath),
  };

  const showDetail = inventoryModel.crosslinkSupport.details;
  const showLogsLink =
    inventoryModel.crosslinkSupport.logs && node.id && uiCapabilities?.logs?.show;
  const showAPMTraceLink =
    inventoryModel.crosslinkSupport.apm && uiCapabilities?.apm && uiCapabilities?.apm.show;
  const showUptimeLink =
    inventoryModel.crosslinkSupport.uptime && (['pod', 'container'].includes(nodeType) || node.ip);

  const items = [
    ...(showLogsLink ? [nodeLogsMenuItem] : []),
    ...(showDetail ? [nodeDetailMenuItem] : []),
    ...(showAPMTraceLink ? [apmTracesMenuItem] : []),
    ...(showUptimeLink ? [uptimeMenuItem] : []),
  ];
  const panels: EuiContextMenuPanelDescriptor[] = [{ id: 0, title: '', items }];

  // If there is nothing to show then we need to return the child as is
  if (items.length === 0) {
    return <>{children}</>;
  }

  return (
    <EuiPopover
      closePopover={closePopover}
      id={`${node.pathId}-popover`}
      isOpen={isPopoverOpen}
      button={children}
      panelPaddingSize="none"
      anchorPosition={popoverPosition}
    >
      <EuiContextMenu initialPanelId={0} panels={panels} data-test-subj="nodeContextMenu" />
    </EuiPopover>
  );
};
