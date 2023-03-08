/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { EuiPortal, EuiFlyout, EuiFlyoutHeader, EuiTitle, EuiFlyoutBody } from '@elastic/eui';
import { EuiSpacer, EuiTabs, EuiTab } from '@elastic/eui';
import { PropertiesTab } from './metadata/metadata';
import { HostNodeRow } from '../../hooks/use_hosts_table';

interface Props {
  onClose(): void;
  currentTime: number;
  node: HostNodeRow;
}

export const Flyout = ({ node, currentTime, onClose }: Props) => {
  const tabs = useMemo(() => {
    const tabConfigs = [PropertiesTab];
    return tabConfigs.map((m) => {
      const TabContent = m.content;
      return {
        ...m,
        content: <TabContent node={node} currentTime={currentTime} />,
      };
    });
  }, [node, currentTime]);

  const [selectedTab, setSelectedTab] = useState(0);

  return (
    <>
      <EuiPortal>
        <EuiFlyout onClose={onClose} ownFocus={false}>
          <EuiFlyoutHeader hasBorder>
            <EuiTitle size="m">
              <h2>{node.name}</h2>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiTabs style={{ marginBottom: '-25px' }} size="s">
              {tabs.map((tab, i) => (
                <EuiTab
                  key={tab.id}
                  isSelected={i === selectedTab}
                  onClick={() => setSelectedTab(i)}
                >
                  {tab.name}
                </EuiTab>
              ))}
            </EuiTabs>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>{tabs[selectedTab].content}</EuiFlyoutBody>
        </EuiFlyout>
      </EuiPortal>
    </>
  );
};
