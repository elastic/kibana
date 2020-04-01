/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useState } from 'react';
import { encode } from 'rison-node';

import { EuiTabs, EuiTab, EuiLink } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { useUrlState } from '../../util/url_state';

import { Tab } from './main_tabs';
import { TabId } from './navigation_menu';

interface Props {
  disableLinks: boolean;
  mainTabId: TabId;
  tabId: TabId;
}

export function getTabs(tabId: TabId, disableLinks: boolean): Tab[] {
  const TAB_MAP: Partial<Record<TabId, Tab[]>> = {
    overview: [],
    datavisualizer: [],
    data_frame_analytics: [],
    anomaly_detection: [
      {
        id: 'jobs',
        name: i18n.translate('xpack.ml.navMenu.jobManagementTabLinkText', {
          defaultMessage: 'Job Management',
        }),
        disabled: disableLinks,
      },
      {
        id: 'explorer',
        name: i18n.translate('xpack.ml.navMenu.anomalyExplorerTabLinkText', {
          defaultMessage: 'Anomaly Explorer',
        }),
        disabled: disableLinks,
      },
      {
        id: 'timeseriesexplorer',
        name: i18n.translate('xpack.ml.navMenu.singleMetricViewerTabLinkText', {
          defaultMessage: 'Single Metric Viewer',
        }),
        disabled: disableLinks,
      },
      {
        id: 'settings',
        name: i18n.translate('xpack.ml.navMenu.settingsTabLinkText', {
          defaultMessage: 'Settings',
        }),
        disabled: disableLinks,
      },
    ],
  };

  return TAB_MAP[tabId] || [];
}

enum TAB_TEST_SUBJECT {
  overview = 'mlOverview',
  jobs = 'mlSubTab jobManagement',
  explorer = 'mlSubTab anomalyExplorer',
  timeseriesexplorer = 'mlSubTab singleMetricViewer',
  settings = 'mlSubTab settings',
}

type TAB_TEST_SUBJECTS = keyof typeof TAB_TEST_SUBJECT;

export const Tabs: FC<Props> = ({ tabId, mainTabId, disableLinks }) => {
  const [globalState] = useUrlState('_g');
  const [selectedTabId, setSelectedTabId] = useState(tabId);
  function onSelectedTabChanged(id: string) {
    setSelectedTabId(id);
  }

  const tabs = getTabs(mainTabId, disableLinks);

  if (tabs.length === 0) return null;

  return (
    <EuiTabs size="s" className={tabId === 'settings' ? 'mlSubTabs' : ''}>
      {tabs.map((tab: Tab) => {
        const id = tab.id;
        // globalState (e.g. selected jobs and time range) should be retained when changing pages.
        // appState will not be considered.
        const fullGlobalStateString = globalState !== undefined ? `?_g=${encode(globalState)}` : '';

        return (
          <EuiLink
            data-test-subj={
              TAB_TEST_SUBJECT[id as TAB_TEST_SUBJECTS] + (id === selectedTabId ? ' selected' : '')
            }
            href={`#/${id}${fullGlobalStateString}`}
            key={`${id}-key`}
            color="text"
          >
            <EuiTab
              className="mlNavigationMenu__tab"
              onClick={() => onSelectedTabChanged(id)}
              isSelected={id === selectedTabId}
              disabled={tab.disabled}
            >
              {tab.name}
            </EuiTab>
          </EuiLink>
        );
      })}
    </EuiTabs>
  );
};
