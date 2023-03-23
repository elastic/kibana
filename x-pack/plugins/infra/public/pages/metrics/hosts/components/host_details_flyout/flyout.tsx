/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { EuiFlyout, EuiFlyoutHeader, EuiTitle, EuiFlyoutBody } from '@elastic/eui';
import { EuiSpacer, EuiTabs, EuiTab } from '@elastic/eui';
import { MetadataTab } from './metadata/metadata';
import type { HostNodeRow } from '../../hooks/use_hosts_table';
import { useUnifiedSearchContext } from '../../hooks/use_unified_search';

interface Props {
  node: HostNodeRow;
  closeFlyout: () => void;
}

const flyoutTabs = [MetadataTab];

export const Flyout = ({ node, closeFlyout }: Props) => {
  const { getDateRangeAsTimestamp } = useUnifiedSearchContext();

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
        <EuiTitle size="xs">
          <h2>{node.name}</h2>
        </EuiTitle>
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
