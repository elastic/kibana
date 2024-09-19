/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useState, useEffect } from 'react';

import { EuiPageHeader } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { TabId } from './navigation_menu';
import { useMlKibana, useMlLocator, useNavigateToPath } from '../../contexts/kibana';
import { MlLocatorParams } from '../../../../common/types/locator';
import { useUrlState } from '../../util/url_state';
import { ML_APP_NAME } from '../../../../common/constants/app';
import './main_tabs.scss';

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
  pathId?: MlLocatorParams['page'];
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
  const mlLocator = useMlLocator();
  const navigateToPath = useNavigateToPath();

  const redirectToTab = async (defaultPathId: MlLocatorParams['page']) => {
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
    const path = await mlLocator.getUrl({
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
    <EuiPageHeader
      paddingSize="m"
      className="mlMainTabs"
      bottomBorder
      tabs={tabs.map((tab: Tab) => {
        const { id, disabled } = tab;
        const testSubject = TAB_DATA[id].testSubject;
        const defaultPathId = (TAB_DATA[id].pathId || id) as MlLocatorParams['page'];

        return {
          label: tab.name,
          disabled,
          onClick: () => {
            onSelectedTabChanged(id);
            redirectToTab(defaultPathId);
          },
          'data-test-subj': testSubject + (id === selectedTabId ? ' selected' : ''),
          isSelected: id === selectedTabId,
        };
      })}
    />
  );
};
