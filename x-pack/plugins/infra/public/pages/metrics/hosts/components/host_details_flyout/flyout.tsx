/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlyoutBody,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
} from '@elastic/eui';
import { EuiSpacer, EuiTabs, EuiTab } from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { EuiIcon } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import { InventoryItemType } from '../../../../../../common/inventory_models/types';
import { InfraClientCoreStart, InfraClientStartDeps } from '../../../../../types';
import { MetadataTab } from './metadata/metadata';
import type { HostNodeRow } from '../../hooks/use_hosts_table';
import { useUnifiedSearchContext } from '../../hooks/use_unified_search';
import { navigateToUptime } from './links/navigate_to_uptime';
import { LinkToApmTraces } from './links/link-to-apm-traces';

interface Props {
  node: HostNodeRow;
  closeFlyout: () => void;
}

const flyoutTabs = [MetadataTab];
const NODE_TYPE = 'host' as InventoryItemType;

export const Flyout = ({ node, closeFlyout }: Props) => {
  const { getDateRangeAsTimestamp } = useUnifiedSearchContext();
  const { share } = useKibana<InfraClientCoreStart & InfraClientStartDeps>().services;

  const tabs = useMemo(() => {
    const currentTimeRange = {
      ...getDateRangeAsTimestamp(),
      interval: '1m',
    };

    return flyoutTabs.map((m) => {
      const TabContent = m.content;
      return {
        ...m,
        content: <TabContent node={node} currentTimeRange={currentTimeRange} />,
      };
    });
  }, [getDateRangeAsTimestamp, node]);

  const [selectedTab, setSelectedTab] = useState(0);

  return (
    <EuiFlyout onClose={closeFlyout} ownFocus={false}>
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem>
            <EuiTitle size="xs">
              <h2>{node.name}</h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiLink
              data-test-subj="infraFlyoutLink"
              onClick={() => navigateToUptime(share.url.locators, NODE_TYPE, node)}
            >
              <EuiIcon type="popout" />{' '}
              <FormattedMessage
                id="xpack.infra.infra.nodeDetails.updtimeTabLabel"
                defaultMessage="Uptime"
              />
            </EuiLink>
          </EuiFlexItem>
          <EuiFlexItem
            grow={false}
            css={css`
              padding-right: 20px;
            `}
          >
            <LinkToApmTraces hostName={node.name} apmField={'host.hostname'} />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiTabs style={{ marginBottom: '-25px' }} size="s">
          {tabs.map((tab, i) => (
            <EuiTab key={tab.id} isSelected={i === selectedTab} onClick={() => setSelectedTab(i)}>
              {tab.name}
            </EuiTab>
          ))}
        </EuiTabs>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>{tabs[selectedTab].content}</EuiFlyoutBody>
    </EuiFlyout>
  );
};
