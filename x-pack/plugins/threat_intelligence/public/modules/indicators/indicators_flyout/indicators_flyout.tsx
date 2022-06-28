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
import { IndicatorsFlyoutJson } from '../indicators_flyout_json/indicators_flyout_json';
import { IndicatorsFlyoutTable } from '../indicators_flyout_table/indicators_flyout_table';

export interface Indicator {
  id: string;
  name: string;
  last_seen: string;
  first_seen: string;
}

export const TITLE_TEST_ID = 'tiIndicatorFlyoutTitle';
export const SUBTITLE_TEST_ID = 'tiIndicatorFlyoutSubtitle';

const enum TAB_IDS {
  table,
  json,
}

export const IndicatorsFlyout: VFC<{ indicator: Indicator; closeFlyout: () => void }> = ({
  indicator,
  closeFlyout,
}) => {
  const [selectedTabId, setSelectedTabId] = useState(TAB_IDS.table);

  const tabs = useMemo(
    () => [
      {
        id: TAB_IDS.table,
        name: 'Table',
        content: <IndicatorsFlyoutTable indicator={indicator} />,
      },
      {
        id: TAB_IDS.json,
        name: 'JSON',
        content: <IndicatorsFlyoutJson indicator={indicator} />,
      },
    ],
    [indicator]
  );
  const onSelectedTabChanged = (id: number) => setSelectedTabId(id);
  const renderTabs = useMemo(
    () =>
      tabs.map((tab, index) => (
        <EuiTab
          onClick={() => onSelectedTabChanged(tab.id)}
          isSelected={tab.id === selectedTabId}
          key={index}
        >
          {tab.name}
        </EuiTab>
      )),
    [selectedTabId, tabs]
  );
  const selectedTabContent = useMemo(
    () => tabs.find((obj) => obj.id === selectedTabId)?.content,
    [selectedTabId, tabs]
  );
  const formattedFirstSeen = useMemo((): string => {
    if (indicator.first_seen) {
      const date = new Date(indicator.first_seen);
      return isNaN(date.getTime()) ? 'N/A' : date.toDateString();
    } else {
      return 'N/A';
    }
  }, [indicator.first_seen]);

  return (
    <EuiFlyout onClose={closeFlyout}>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle>
          <h2 data-test-subj={TITLE_TEST_ID}>Indicator: {indicator.id || 'N/A'}</h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText size={'xs'}>
          <p data-test-subj={SUBTITLE_TEST_ID}>First seen: {formattedFirstSeen}</p>
        </EuiText>
        <EuiSpacer size="m" />
        <EuiTabs style={{ marginBottom: '-25px' }}>{renderTabs}</EuiTabs>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>{selectedTabContent}</EuiFlyoutBody>
    </EuiFlyout>
  );
};
