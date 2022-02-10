/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPortal, EuiTabs, EuiTab, EuiPanel, EuiTitle, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useMemo, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiButtonEmpty } from '@elastic/eui';
import { EuiOutsideClickDetector } from '@elastic/eui';
import { EuiIcon, EuiButtonIcon } from '@elastic/eui';
import { euiStyled } from '../../../../../../../../../src/plugins/kibana_react/common';
import { useKibana } from '../../../../../../../../../src/plugins/kibana_react/public';
import { InfraWaffleMapNode, InfraWaffleMapOptions } from '../../../../../lib/lib';
import { InventoryItemType } from '../../../../../../common/inventory_models/types';
import { MetricsTab } from './tabs/metrics/metrics';
import { LogsTab } from './tabs/logs';
import { ProcessesTab } from './tabs/processes';
import { PropertiesTab } from './tabs/properties/index';
import { AnomaliesTab } from './tabs/anomalies/anomalies';
import { OsqueryTab } from './tabs/osquery';
import { OVERLAY_Y_START, OVERLAY_BOTTOM_MARGIN } from './tabs/shared';
import { useLinkProps } from '../../../../../../../observability/public';
import { getNodeDetailUrl } from '../../../../link_to';
import { findInventoryModel } from '../../../../../../common/inventory_models';
import { createUptimeLink } from '../../lib/create_uptime_link';

interface Props {
  isOpen: boolean;
  onClose(): void;
  options: InfraWaffleMapOptions;
  currentTime: number;
  node: InfraWaffleMapNode;
  nodeType: InventoryItemType;
  openAlertFlyout(): void;
}
export const NodeContextPopover = ({
  isOpen,
  node,
  nodeType,
  currentTime,
  options,
  onClose,
  openAlertFlyout,
}: Props) => {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const tabConfigs = [MetricsTab, LogsTab, ProcessesTab, PropertiesTab, AnomaliesTab, OsqueryTab];
  const inventoryModel = findInventoryModel(nodeType);
  const nodeDetailFrom = currentTime - inventoryModel.metrics.defaultTimeRangeInSeconds * 1000;
  const uiCapabilities = useKibana().services.application?.capabilities;
  const canCreateAlerts = useMemo(
    () => Boolean(uiCapabilities?.infrastructure?.save),
    [uiCapabilities]
  );

  const tabs = useMemo(() => {
    return tabConfigs.map((m) => {
      const TabContent = m.content;
      return {
        ...m,
        content: (
          <TabContent
            onClose={onClose}
            node={node}
            nodeType={nodeType}
            currentTime={currentTime}
            options={options}
          />
        ),
      };
    });
  }, [tabConfigs, node, nodeType, currentTime, onClose, options]);

  const [selectedTab, setSelectedTab] = useState(0);

  const nodeDetailMenuItemLinkProps = useLinkProps({
    ...getNodeDetailUrl({
      nodeType,
      nodeId: node.id,
      from: nodeDetailFrom,
      to: currentTime,
    }),
  });
  const apmField = nodeType === 'host' ? 'host.hostname' : inventoryModel.fields.id;
  const apmTracesMenuItemLinkProps = useLinkProps({
    app: 'apm',
    hash: 'traces',
    search: {
      kuery: `${apmField}:"${node.id}"`,
    },
  });
  const uptimeMenuItemLinkProps = useLinkProps(createUptimeLink(options, nodeType, node));

  if (!isOpen) {
    return null;
  }

  return (
    <EuiPortal>
      <EuiOutsideClickDetector onOutsideClick={onClose}>
        <OverlayPanel>
          <OverlayHeader>
            <EuiFlexGroup responsive={false} gutterSize="m">
              <OverlayTitle grow={true}>
                <EuiTitle size="xs">
                  <h4>{node.name}</h4>
                </EuiTitle>
              </OverlayTitle>
              <EuiFlexItem grow={false}>
                <EuiFlexGroup gutterSize="m" responsive={false}>
                  {canCreateAlerts && (
                    <EuiFlexItem grow={false}>
                      <EuiButtonEmpty
                        onClick={openAlertFlyout}
                        size="xs"
                        iconSide={'left'}
                        flush="both"
                        iconType="bell"
                      >
                        <FormattedMessage
                          id="xpack.infra.infra.nodeDetails.createAlertLink"
                          defaultMessage="Create inventory rule"
                        />
                      </EuiButtonEmpty>
                    </EuiFlexItem>
                  )}
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty
                      size="xs"
                      iconSide={'left'}
                      iconType={'popout'}
                      href={nodeDetailMenuItemLinkProps.href}
                      flush="both"
                    >
                      <FormattedMessage
                        id="xpack.infra.infra.nodeDetails.openAsPage"
                        defaultMessage="Open as page"
                      />
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButtonIcon size="s" onClick={onClose} iconType="cross" />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="s" />
            <EuiTabs size="s">
              {tabs.map((tab, i) => (
                <EuiTab
                  key={tab.id}
                  isSelected={i === selectedTab}
                  onClick={() => setSelectedTab(i)}
                >
                  {tab.name}
                </EuiTab>
              ))}
              <EuiTab {...apmTracesMenuItemLinkProps}>
                <EuiIcon type="popout" />{' '}
                <FormattedMessage
                  id="xpack.infra.infra.nodeDetails.apmTabLabel"
                  defaultMessage="APM"
                />
              </EuiTab>
              <EuiTab {...uptimeMenuItemLinkProps}>
                <EuiIcon type="popout" />{' '}
                <FormattedMessage
                  id="xpack.infra.infra.nodeDetails.updtimeTabLabel"
                  defaultMessage="Uptime"
                />
              </EuiTab>
            </EuiTabs>
          </OverlayHeader>
          {tabs[selectedTab].content}
        </OverlayPanel>
      </EuiOutsideClickDetector>
    </EuiPortal>
  );
};

const OverlayHeader = euiStyled.div`
  padding-top: ${(props) => props.theme.eui.paddingSizes.m};
  padding-right: ${(props) => props.theme.eui.paddingSizes.m};
  padding-left: ${(props) => props.theme.eui.paddingSizes.m};
  background-color: ${(props) => props.theme.eui.euiPageBackgroundColor};
  box-shadow: inset 0 -1px ${(props) => props.theme.eui.euiBorderColor};
`;

const OverlayPanel = euiStyled(EuiPanel).attrs({ paddingSize: 'none' })`
  display: flex;
  flex-direction: column;
  position: absolute;
  right: 16px;
  top: ${OVERLAY_Y_START}px;
  width: 100%;
  max-width: 720px;
  z-index: 2;
  max-height: calc(100vh - ${OVERLAY_Y_START + OVERLAY_BOTTOM_MARGIN}px);
  overflow: hidden;

  @media (max-width: 752px) {
    border-radius: 0px !important;
    left: 0px;
    right: 0px;
    top: 97px;
    bottom: 0;
    max-height: calc(100vh - 97px);
    max-width: 100%;
  }
`;

const OverlayTitle = euiStyled(EuiFlexItem)`
  overflow: hidden;
  & h4 {
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
  }
`;
