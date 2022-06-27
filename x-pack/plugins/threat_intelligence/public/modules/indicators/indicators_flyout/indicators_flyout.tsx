/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState, VFC } from 'react';
import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FlyoutJson } from '../flyout_json/flyout_json';
import { FlyoutTable } from '../flyout_table/flyout_table';

export interface Indicator {
  id: string;
  name: string;
  last_seen: string;
  first_seen: string;
}

export const IndicatorsFlyout: VFC<{ indicator: Indicator; closeFlyout: () => void }> = ({
  indicator,
  closeFlyout,
}) => {
  const [selectedTabId, setSelectedTabId] = useState('1');

  const tabs = [
    {
      id: '1',
      name: 'Table',
      content: <FlyoutTable indicator={indicator} />,
    },
    {
      id: '2',
      name: 'JSON',
      content: <FlyoutJson indicator={indicator} />,
    },
  ];
  const onSelectedTabChanged = (id: string) => setSelectedTabId(id);
  const renderTabs = tabs.map((tab, index) => (
    <EuiTab
      onClick={() => onSelectedTabChanged(tab.id)}
      isSelected={tab.id === selectedTabId}
      key={index}
    >
      {tab.name}
    </EuiTab>
  ));
  const selectedTabContent = useMemo(() => {
    return tabs.find((obj) => obj.id === selectedTabId)?.content;
  }, [selectedTabId]);

  return (
    <EuiFlyout onClose={closeFlyout}>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle>
          <h2 data-test-subj={'tiIndicatorFlyoutTitle'}>Indicator: {indicator.id || 'N/A'}</h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText size={'xs'}>
          <p data-test-subj={'tiIndicatorFlyoutSubtitle'}>
            First seen: {indicator.first_seen || 'N/A'}
          </p>
        </EuiText>
        <EuiSpacer size="m" />
        <EuiTabs style={{ marginBottom: '-25px' }}>{renderTabs}</EuiTabs>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>{selectedTabContent}</EuiFlyoutBody>
    </EuiFlyout>
  );
};
