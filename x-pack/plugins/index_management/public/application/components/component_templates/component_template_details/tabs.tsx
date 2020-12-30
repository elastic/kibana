/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiTab, EuiTabs } from '@elastic/eui';

export type TabType = 'summary' | 'mappings' | 'aliases' | 'settings';

interface Props {
  setActiveTab: (id: TabType) => void;
  activeTab: TabType;
}

interface Tab {
  id: TabType;
  name: string;
}

const TABS: Tab[] = [
  {
    id: 'summary',
    name: i18n.translate('xpack.idxMgmt.componentTemplateDetails.summaryTabTitle', {
      defaultMessage: 'Summary',
    }),
  },
  {
    id: 'settings',
    name: i18n.translate('xpack.idxMgmt.componentTemplateDetails.settingsTabTitle', {
      defaultMessage: 'Settings',
    }),
  },
  {
    id: 'mappings',
    name: i18n.translate('xpack.idxMgmt.componentTemplateDetails.mappingsTabTitle', {
      defaultMessage: 'Mappings',
    }),
  },
  {
    id: 'aliases',
    name: i18n.translate('xpack.idxMgmt.componentTemplateDetails.aliasesTabTitle', {
      defaultMessage: 'Aliases',
    }),
  },
];

export const ComponentTemplateTabs: React.FunctionComponent<Props> = ({
  setActiveTab,
  activeTab,
}) => {
  return (
    <EuiTabs>
      {TABS.map((tab) => (
        <EuiTab
          onClick={() => {
            setActiveTab(tab.id);
          }}
          isSelected={tab.id === activeTab}
          key={tab.id}
          data-test-subj={`${tab.id}Tab`}
        >
          {tab.name}
        </EuiTab>
      ))}
    </EuiTabs>
  );
};
