/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiTab, EuiTabs } from '@elastic/eui';

import {
  UIM_COMPONENT_TEMPLATE_DETAIL_PANEL_SUMMARY_TAB,
  UIM_COMPONENT_TEMPLATE_DETAIL_PANEL_SETTINGS_TAB,
  UIM_COMPONENT_TEMPLATE_DETAIL_PANEL_MAPPINGS_TAB,
  UIM_COMPONENT_TEMPLATE_DETAIL_PANEL_ALIASES_TAB,
} from '../../constants';
import { useComponentTemplatesContext } from '../../component_templates_context';

export type Tab = TabType.Summary | TabType.Mappings | TabType.Aliases | TabType.Settings;

export enum TabType {
  Summary = 'summary',
  Mappings = 'mappings',
  Aliases = 'aliases',
  Settings = 'settings',
}

interface Props {
  setActiveTab: (id: Tab) => void;
  activeTab: Tab;
}

const TABS = [
  {
    id: TabType.Summary,
    name: i18n.translate('xpack.idxMgmt.componentTemplateDetails.summaryTabTitle', {
      defaultMessage: 'Summary',
    }),
  },
  {
    id: TabType.Settings,
    name: i18n.translate('xpack.idxMgmt.componentTemplateDetails.settingsTabTitle', {
      defaultMessage: 'Settings',
    }),
  },
  {
    id: TabType.Mappings,
    name: i18n.translate('xpack.idxMgmt.componentTemplateDetails.mappingsTabTitle', {
      defaultMessage: 'Mappings',
    }),
  },
  {
    id: TabType.Aliases,
    name: i18n.translate('xpack.idxMgmt.componentTemplateDetails.aliasesTabTitle', {
      defaultMessage: 'Aliases',
    }),
  },
];

const tabToUiMetricMap: { [key: string]: string } = {
  [TabType.Summary]: UIM_COMPONENT_TEMPLATE_DETAIL_PANEL_SUMMARY_TAB,
  [TabType.Settings]: UIM_COMPONENT_TEMPLATE_DETAIL_PANEL_SETTINGS_TAB,
  [TabType.Mappings]: UIM_COMPONENT_TEMPLATE_DETAIL_PANEL_MAPPINGS_TAB,
  [TabType.Aliases]: UIM_COMPONENT_TEMPLATE_DETAIL_PANEL_ALIASES_TAB,
};

export const ComponentTemplateTabs: React.FunctionComponent<Props> = ({
  setActiveTab,
  activeTab,
}) => {
  const { trackMetric } = useComponentTemplatesContext();

  return (
    <EuiTabs>
      {TABS.map((tab) => (
        <EuiTab
          onClick={() => {
            trackMetric('click', tabToUiMetricMap[tab.id]);
            setActiveTab(tab.id);
          }}
          isSelected={tab.id === activeTab}
          key={tab.id}
          data-test-subj="tab"
        >
          {tab.name}
        </EuiTab>
      ))}
    </EuiTabs>
  );
};
