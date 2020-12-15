/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiPortal, EuiTabs, EuiTab, EuiPanel, EuiTitle, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { useMemo, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiButtonEmpty } from '@elastic/eui';
import { euiStyled } from '../../../../../../../observability/public';
import { InfraWaffleMapNode, InfraWaffleMapOptions } from '../../../../../lib/lib';
import { InventoryItemType } from '../../../../../../common/inventory_models/types';
import { MetricsTab } from './tabs/metrics/metrics';
import { LogsTab } from './tabs/logs';
import { ProcessesTab } from './tabs/processes';
import { PropertiesTab } from './tabs/properties/index';
import { OVERLAY_Y_START, OVERLAY_BOTTOM_MARGIN } from './tabs/shared';
import { useLinkProps } from '../../../../../hooks/use_link_props';
import { getNodeDetailUrl } from '../../../../link_to';
import { findInventoryModel } from '../../../../../../common/inventory_models';

interface Props {
  isOpen: boolean;
  onClose(): void;
  options: InfraWaffleMapOptions;
  currentTime: number;
  node: InfraWaffleMapNode;
  nodeType: InventoryItemType;
}
export const NodeContextPopover = ({
  isOpen,
  node,
  nodeType,
  currentTime,
  options,
  onClose,
}: Props) => {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const tabConfigs = [MetricsTab, LogsTab, ProcessesTab, PropertiesTab];
  const inventoryModel = findInventoryModel(nodeType);
  const nodeDetailFrom = currentTime - inventoryModel.metrics.defaultTimeRangeInSeconds * 1000;

  const tabs = useMemo(() => {
    return tabConfigs.map((m) => {
      const TabContent = m.content;
      return {
        ...m,
        content: (
          <TabContent node={node} nodeType={nodeType} currentTime={currentTime} options={options} />
        ),
      };
    });
  }, [tabConfigs, node, nodeType, currentTime, options]);

  const [selectedTab, setSelectedTab] = useState(0);

  const nodeDetailMenuItemLinkProps = useLinkProps({
    ...getNodeDetailUrl({
      nodeType,
      nodeId: node.id,
      from: nodeDetailFrom,
      to: currentTime,
    }),
  });

  if (!isOpen) {
    return null;
  }

  return (
    <EuiPortal>
      <OverlayPanel>
        <OverlayHeader>
          <EuiFlexGroup responsive={false} gutterSize="m">
            <EuiFlexItem grow={true}>
              <EuiTitle size="xs">
                <h4>{node.name}</h4>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="m" responsive={false}>
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
                  <EuiButtonEmpty size="xs" onClick={onClose} iconType="cross" flush="both">
                    <FormattedMessage
                      id="xpack.infra.infra.nodeDetails.close"
                      defaultMessage="Close"
                    />
                  </EuiButtonEmpty>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="s" />
          <EuiTabs size="s">
            {tabs.map((tab, i) => (
              <EuiTab key={tab.id} isSelected={i === selectedTab} onClick={() => setSelectedTab(i)}>
                {tab.name}
              </EuiTab>
            ))}
          </EuiTabs>
        </OverlayHeader>
        {tabs[selectedTab].content}
      </OverlayPanel>
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
