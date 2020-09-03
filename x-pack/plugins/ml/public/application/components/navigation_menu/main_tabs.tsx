/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useState, useEffect } from 'react';

import { EuiTabs, EuiTab, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { TabId } from './navigation_menu';
import { useMlUrlGenerator, useNavigateToPath } from '../../contexts/kibana';
import { MlUrlGeneratorState } from '../../../../common/types/ml_url_generator';

export interface Tab {
  id: TabId;
  name: any;
  disabled: boolean;
}

interface Props {
  disableLinks: boolean;
  tabId: TabId;
}

function getTabs(disableLinks: boolean): Tab[] {
  return [
    {
      id: 'overview',
      name: i18n.translate('xpack.ml.navMenu.overviewTabLinkText', {
        defaultMessage: 'Overview',
      }),
      disabled: disableLinks,
    },
    {
      id: 'anomaly_detection',
      name: i18n.translate('xpack.ml.navMenu.anomalyDetectionTabLinkText', {
        defaultMessage: 'Anomaly Detection',
      }),
      disabled: disableLinks,
    },
    {
      id: 'data_frame_analytics',
      name: i18n.translate('xpack.ml.navMenu.dataFrameAnalyticsTabLinkText', {
        defaultMessage: 'Data Frame Analytics',
      }),
      disabled: disableLinks,
    },
    {
      id: 'datavisualizer',
      name: i18n.translate('xpack.ml.navMenu.dataVisualizerTabLinkText', {
        defaultMessage: 'Data Visualizer',
      }),
      disabled: false,
    },
    {
      id: 'settings',
      name: i18n.translate('xpack.ml.navMenu.settingsTabLinkText', {
        defaultMessage: 'Settings',
      }),
      disabled: disableLinks,
    },
  ];
}
interface TabData {
  testSubject: string;
  pathId?: MlUrlGeneratorState['page'];
  name: string;
}

const TAB_DATA: Record<TabId, TabData> = {
  overview: { testSubject: 'mlMainTab overview', name: 'Overview' },
  // Note that anomaly detection jobs list is mapped to ml#/jobs.
  anomaly_detection: {
    testSubject: 'mlMainTab anomalyDetection',
    name: 'Anomaly Detection',
    pathId: 'jobs',
  },
  data_frame_analytics: {
    testSubject: 'mlMainTab dataFrameAnalytics',
    name: 'Data Frame Analytics',
  },
  datavisualizer: { testSubject: 'mlMainTab dataVisualizer', name: 'Data Visualizer' },
  settings: { testSubject: 'mlMainTab settings', name: 'Settings' },
  'access-denied': { testSubject: 'mlMainTab overview', name: 'Access Denied' },
};

export const MainTabs: FC<Props> = ({ tabId, disableLinks }) => {
  const [selectedTabId, setSelectedTabId] = useState(tabId);
  function onSelectedTabChanged(id: TabId) {
    setSelectedTabId(id);
  }

  const tabs = getTabs(disableLinks);
  const mlUrlGenerator = useMlUrlGenerator();
  const navigateToPath = useNavigateToPath();

  const redirectToTab = async (defaultPathId: MlUrlGeneratorState['page']) => {
    const path = await mlUrlGenerator.createUrl({
      page: defaultPathId,
    });

    await navigateToPath(path, true); // set preserve search to true
  };

  useEffect(() => {
    document.title = `ML - ${TAB_DATA[selectedTabId].name} - Kibana`;
  }, [selectedTabId]);

  return (
    <EuiTabs display="condensed">
      {tabs.map((tab: Tab) => {
        const { id, disabled } = tab;
        const testSubject = TAB_DATA[id].testSubject;
        const defaultPathId = (TAB_DATA[id].pathId || id) as MlUrlGeneratorState['page'];
        // globalState (e.g. selected jobs and time range) should be retained when changing pages.
        // appState will not be considered.

        return disabled ? (
          <EuiTab key={`${id}-key`} className={'mlNavigationMenu__mainTab'} disabled={true}>
            {tab.name}
          </EuiTab>
        ) : (
          <div className="euiTab" key={`div-${id}-key`}>
            <EuiLink
              data-test-subj={testSubject + (id === selectedTabId ? ' selected' : '')}
              onClick={() => redirectToTab(defaultPathId)}
              key={`${id}-key`}
              color="text"
            >
              <EuiTab
                className={'mlNavigationMenu__mainTab'}
                onClick={() => onSelectedTabChanged(id)}
                isSelected={id === selectedTabId}
                key={`tab-${id}-key`}
              >
                {tab.name}
              </EuiTab>
            </EuiLink>
          </div>
        );
      })}
    </EuiTabs>
  );
};
