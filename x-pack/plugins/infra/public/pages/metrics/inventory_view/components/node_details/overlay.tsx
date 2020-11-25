/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiTabbedContent } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiPanel } from '@elastic/eui';
import React, { CSSProperties, useMemo } from 'react';
import { EuiText } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiButtonEmpty } from '@elastic/eui';
import { euiStyled } from '../../../../../../../observability/public';
import { InfraWaffleMapNode, InfraWaffleMapOptions } from '../../../../../lib/lib';
import { InventoryItemType } from '../../../../../../common/inventory_models/types';
import { MetricsTab } from './tabs/metrics';
import { LogsTab } from './tabs/logs';
import { ProcessesTab } from './tabs/processes';
import { PropertiesTab } from './tabs/properties';

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

  if (!isOpen) {
    return null;
  }

  return (
    <EuiPanel hasShadow={true} paddingSize={'none'} style={panelStyle}>
      <OverlayHeader>
        <EuiFlexGroup alignItems={'center'}>
          <EuiFlexItem grow={true}>
            <EuiText>
              <h4>{node.name}</h4>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose} iconType={'cross'}>
              <FormattedMessage id="xpack.infra.infra.nodeDetails.close" defaultMessage="Close" />
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </OverlayHeader>
      <EuiTabbedContent tabs={tabs} />
    </EuiPanel>
  );
};

const OverlayHeader = euiStyled.div`
  border-color: ${(props) => props.theme.eui.euiBorderColor};
  border-bottom-width: ${(props) => props.theme.eui.euiBorderWidthThick};
  padding: ${(props) => props.theme.eui.euiSizeS};
  padding-bottom: 0;
  overflow: hidden;
`;

const panelStyle: CSSProperties = {
  position: 'absolute',
  right: 10,
  top: -100,
  width: '50%',
  maxWidth: 600,
  zIndex: 2,
  height: '50vh',
  overflow: 'hidden',
};
