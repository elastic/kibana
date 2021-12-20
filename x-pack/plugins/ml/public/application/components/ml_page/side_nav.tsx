/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { TabId } from '../navigation_menu/navigation_menu';
import { MlLocatorParams } from '../../../../common/types/locator';
import { useUrlState } from '../../util/url_state';
import { useMlLocator, useNavigateToPath } from '../../contexts/kibana';
import { isFullLicense } from '../../license';

export interface Tab {
  id: TabId;
  name: any;
  disabled: boolean;
  betaTag?: JSX.Element;
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
      id: 'trained_models',
      name: i18n.translate('xpack.ml.navMenu.trainedModelsTabLinkText', {
        defaultMessage: 'Model Management',
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
  trained_models: {
    testSubject: 'mlMainTab modelManagement',
    name: i18n.translate('xpack.ml.trainedModelsTabLabel', {
      defaultMessage: 'Trained Models',
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

export function useSideNavItems(activeRouteId: string) {
  const mlLocator = useMlLocator();
  const navigateToPath = useNavigateToPath();

  const [globalState] = useUrlState('_g');

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

  const tabs = getTabs(!isFullLicense());

  return tabs.map((tab) => {
    const { id, disabled } = tab;
    const testSubject = TAB_DATA[id].testSubject;
    const defaultPathId = (TAB_DATA[id].pathId || id) as MlLocatorParams['page'];

    return {
      id,
      name: tab.name,
      isSelected: id === activeRouteId,
      disabled,
      onClick: () => {
        redirectToTab(defaultPathId);
      },
      'data-test-subj': testSubject + (id === activeRouteId ? ' selected' : ''),
    };
  });
}
