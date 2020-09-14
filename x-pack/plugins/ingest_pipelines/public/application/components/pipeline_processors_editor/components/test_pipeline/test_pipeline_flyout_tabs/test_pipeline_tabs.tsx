/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiTab, EuiTabs } from '@elastic/eui';

export type TestPipelineFlyoutTab = 'documents' | 'output';

interface Props {
  onTabChange: (tab: TestPipelineFlyoutTab) => void;
  selectedTab: TestPipelineFlyoutTab;
  getIsDisabled: (tab: TestPipelineFlyoutTab) => boolean;
}

export const Tabs: React.FunctionComponent<Props> = ({
  onTabChange,
  selectedTab,
  getIsDisabled,
}) => {
  const tabs: Array<{
    id: TestPipelineFlyoutTab;
    name: React.ReactNode;
  }> = [
    {
      id: 'documents',
      name: (
        <FormattedMessage
          id="xpack.ingestPipelines.tabs.configurationTabTitle"
          defaultMessage="Configuration"
        />
      ),
    },
    {
      id: 'output',
      name: (
        <FormattedMessage id="xpack.ingestPipelines.tabs.outputTabTitle" defaultMessage="Output" />
      ),
    },
  ];

  return (
    <EuiTabs>
      {tabs.map((tab) => (
        <EuiTab
          onClick={() => onTabChange(tab.id)}
          isSelected={tab.id === selectedTab}
          key={tab.id}
          disabled={getIsDisabled(tab.id)}
          data-test-subj={tab.id.toLowerCase() + 'Tab'}
        >
          {tab.name}
        </EuiTab>
      ))}
    </EuiTabs>
  );
};
