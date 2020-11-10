/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useState, useEffect } from 'react';

import { EuiTabs, EuiTab } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { TabId } from './navigation_menu';
import { useMlKibana, useMlUrlGenerator, useNavigateToPath } from '../../contexts/kibana';
import { MlUrlGeneratorState } from '../../../../common/types/ml_url_generator';
import { useUrlState } from '../../util/url_state';
import { ML_APP_NAME } from '../../../../common/constants/app';

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
  overview: {
    testSubject: 'mlMainTab overview',
    name: i18n.translate('xpack.ml.overviewTabLabel', {
      defaultMessage: 'Overview',
    }),
  },
  // Note that anomaly detection jobs list is mapped to ml#/jobs.
  anomaly_detection: {
    testSubject: 'mlMainTab anomalyDetection',
    name: i18n.translate('xpack.ml.anomalyDetectionTabLabel', {
      defaultMessage: 'Anomaly Detection',
    }),
    pathId: 'jobs',
  },
  data_frame_analytics: {
    testSubject: 'mlMainTab dataFrameAnalytics',
    name: i18n.translate('xpack.ml.dataFrameAnalyticsTabLabel', {
      defaultMessage: 'Data Frame Analytics',
    }),
  },
  datavisualizer: {
    testSubject: 'mlMainTab dataVisualizer',
    name: i18n.translate('xpack.ml.dataVisualizerTabLabel', {
      defaultMessage: 'Data Visualizer',
    }),
  },
  settings: {
    testSubject: 'mlMainTab settings',
    name: i18n.translate('xpack.ml.settingsTabLabel', {
      defaultMessage: 'Settings',
    }),
  },
  'access-denied': {
    testSubject: 'mlMainTab overview',
    name: i18n.translate('xpack.ml.accessDeniedTabLabel', {
      defaultMessage: 'Access Denied',
    }),
  },
};

export const MainTabs: FC<Props> = ({ tabId, disableLinks }) => {
  const {
    services: {
      chrome: { docTitle },
    },
  } = useMlKibana();
  const [globalState] = useUrlState('_g');
  const [selectedTabId, setSelectedTabId] = useState(tabId);
  function onSelectedTabChanged(id: TabId) {
    setSelectedTabId(id);
  }

  const tabs = getTabs(disableLinks);
  const mlUrlGenerator = useMlUrlGenerator();
  const navigateToPath = useNavigateToPath();

  const redirectToTab = async (defaultPathId: MlUrlGeneratorState['page']) => {
    const pageState =
      globalState?.refreshInterval !== undefined
        ? {
            globalState: {
              refreshInterval: globalState.refreshInterval,
            },
          }
        : undefined;
    // TODO - Fix ts so passing pageState won't default to MlGenericUrlState when pageState is passed in
    // @ts-ignore
    const path = await mlUrlGenerator.createUrl({
      page: defaultPathId,
      // only retain the refreshInterval part of globalState
      // appState will not be considered.
      pageState,
    });

    await navigateToPath(path, false);
  };

  useEffect(() => {
    docTitle.change([TAB_DATA[selectedTabId].name, ML_APP_NAME]);
  }, [selectedTabId]);

  return (
    <EuiTabs display="condensed">
      {tabs.map((tab: Tab) => {
        const { id, disabled } = tab;
        const testSubject = TAB_DATA[id].testSubject;
        const defaultPathId = (TAB_DATA[id].pathId || id) as MlUrlGeneratorState['page'];

        return disabled ? (
          <EuiTab
            key={`${id}-key`}
            className={'mlNavigationMenu__mainTab'}
            disabled={true}
            data-test-subj={testSubject}
          >
            {tab.name}
          </EuiTab>
        ) : (
          <div className="euiTab" key={`div-${id}-key`}>
            <EuiTab
              data-test-subj={testSubject + (id === selectedTabId ? ' selected' : '')}
              className={'mlNavigationMenu__mainTab'}
              onClick={() => {
                onSelectedTabChanged(id);
                redirectToTab(defaultPathId);
              }}
              isSelected={id === selectedTabId}
              key={`tab-${id}-key`}
            >
              {tab.name}
            </EuiTab>
          </div>
        );
      })}
    </EuiTabs>
  );
};
