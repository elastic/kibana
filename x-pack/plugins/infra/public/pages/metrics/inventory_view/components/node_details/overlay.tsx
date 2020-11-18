/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiPortal, EuiTabs, EuiTab, EuiPanel, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { CSSProperties, useMemo, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiButtonEmpty } from '@elastic/eui';
import { euiStyled } from '../../../../../../../observability/public';
import { InfraWaffleMapNode, InfraWaffleMapOptions } from '../../../../../lib/lib';
import { InventoryItemType } from '../../../../../../common/inventory_models/types';
import { MetricsTab } from './tabs/metrics/metrics';
import { LogsTab } from './tabs/logs';
import { ProcessesTab } from './tabs/processes';
import { PropertiesTab } from './tabs/properties';
import { OVERLAY_Y_START, OVERLAY_BOTTOM_MARGIN, OVERLAY_HEADER_SIZE } from './tabs/shared';

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
  const tabConfigs = [MetricsTab, LogsTab, ProcessesTab, PropertiesTab];

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

  if (!isOpen) {
    return null;
  }

  return (
    <EuiPortal>
      <EuiPanel hasShadow={true} paddingSize={'none'} style={panelStyle}>
        <OverlayHeader>
          <OverlayHeaderTitleWrapper>
            <EuiFlexItem grow={true}>
              <EuiTitle size="s">
                <h4>{node.name}</h4>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty onClick={onClose} iconType={'cross'}>
                <FormattedMessage id="xpack.infra.infra.nodeDetails.close" defaultMessage="Close" />
              </EuiButtonEmpty>
            </EuiFlexItem>
          </OverlayHeaderTitleWrapper>
          <EuiTabs>
            {tabs.map((tab, i) => (
              <EuiTab key={tab.id} isSelected={i === selectedTab} onClick={() => setSelectedTab(i)}>
                {tab.name}
              </EuiTab>
            ))}
          </EuiTabs>
        </OverlayHeader>
        {tabs[selectedTab].content}
      </EuiPanel>
    </EuiPortal>
  );
};

const OverlayHeader = euiStyled.div`
  border-color: ${(props) => props.theme.eui.euiBorderColor};
  border-bottom-width: ${(props) => props.theme.eui.euiBorderWidthThick};
  padding-bottom: 0;
  overflow: hidden;
  background-color: ${(props) => props.theme.eui.euiColorLightestShade};
  height: ${OVERLAY_HEADER_SIZE}px;
`;

const OverlayHeaderTitleWrapper = euiStyled(EuiFlexGroup).attrs({ alignItems: 'center' })`
  padding: ${(props) => props.theme.eui.paddingSizes.s} ${(props) =>
  props.theme.eui.paddingSizes.m} 0;
`;

const panelStyle: CSSProperties = {
  position: 'absolute',
  right: 10,
  top: OVERLAY_Y_START,
  width: '50%',
  maxWidth: 730,
  zIndex: 2,
  height: `calc(100vh - ${OVERLAY_Y_START + OVERLAY_BOTTOM_MARGIN}px)`,
  overflow: 'hidden',
};
