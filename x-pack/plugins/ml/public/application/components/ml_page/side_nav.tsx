/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { EuiSideNavItemType } from '@elastic/eui';
import { useCallback, useEffect, useMemo } from 'react';
import type { MlLocatorParams } from '../../../../common/types/locator';
import { useUrlState } from '../../util/url_state';
import { useMlKibana, useMlLocator, useNavigateToPath } from '../../contexts/kibana';
import { isFullLicense } from '../../license';
import { ML_APP_NAME } from '../../../../common/constants/app';
import type { MlRoute } from '../../routing';
import { ML_PAGES } from '../../../../common/constants/locator';

export interface Tab {
  id: string;
  name: string;
  disabled?: boolean;
  items?: Tab[];
  testSubj?: string;
  pathId?: MlLocatorParams['page'];
  onClick?: () => Promise<void>;
  /** Indicates if item should be marked as active with nested routes */
  highlightNestedRoutes?: boolean;
}

interface TabData {
  name: string;
}

export const TAB_DATA: Record<string, TabData> = {
  overview: {
    name: i18n.translate('xpack.ml.overviewTabLabel', {
      defaultMessage: 'Overview',
    }),
  },
  // Note that anomaly detection jobs list is mapped to ml#/jobs.
  anomaly_detection: {
    name: i18n.translate('xpack.ml.anomalyDetectionTabLabel', {
      defaultMessage: 'Anomaly Detection',
    }),
  },
  data_frame_analytics: {
    name: i18n.translate('xpack.ml.dataFrameAnalyticsTabLabel', {
      defaultMessage: 'Data Frame Analytics',
    }),
  },
  trained_models: {
    name: i18n.translate('xpack.ml.trainedModelsTabLabel', {
      defaultMessage: 'Trained Models',
    }),
  },
  datavisualizer: {
    name: i18n.translate('xpack.ml.dataVisualizerTabLabel', {
      defaultMessage: 'Data Visualizer',
    }),
  },
  data_view_datavisualizer: {
    name: i18n.translate('xpack.ml.dataViewDataVisualizerTabLabel', {
      defaultMessage: 'Data View',
    }),
  },
  filedatavisualizer: {
    name: i18n.translate('xpack.ml.fileDataVisualizerTabLabel', {
      defaultMessage: 'File',
    }),
  },
  settings: {
    name: i18n.translate('xpack.ml.settingsTabLabel', {
      defaultMessage: 'Settings',
    }),
  },
  'access-denied': {
    name: i18n.translate('xpack.ml.accessDeniedTabLabel', {
      defaultMessage: 'Access Denied',
    }),
  },
};

export function useSideNavItems(activeRoute: MlRoute | undefined) {
  const activeRouteId = activeRoute?.id;
  const {
    services: {
      chrome: { docTitle },
    },
  } = useMlKibana();
  const mlLocator = useMlLocator();
  const navigateToPath = useNavigateToPath();

  const mlFeaturesDisabled = !isFullLicense();

  useEffect(() => {
    const title = TAB_DATA[activeRouteId!]?.name;
    if (title) {
      docTitle.change([title, ML_APP_NAME]);
    }
  }, [activeRouteId]);

  const [globalState] = useUrlState('_g');

  const pageState = useMemo(() => {
    return globalState?.refreshInterval !== undefined
      ? {
          globalState: {
            refreshInterval: globalState.refreshInterval,
          },
        }
      : undefined;
  }, [globalState]);

  const redirectToTab = useCallback(
    async (defaultPathId: MlLocatorParams['page']) => {
      const path = await mlLocator!.getUrl({
        page: defaultPathId,
        // only retain the refreshInterval part of globalState
        // appState will not be considered.
        pageState,
      });

      await navigateToPath(path, false);
    },
    [pageState]
  );

  const tabsDefinition: Tab[] = useMemo((): Tab[] => {
    const disableLinks = mlFeaturesDisabled;

    return [
      {
        id: 'main_section',
        name: '',
        items: [
          {
            id: 'overview',
            pathId: ML_PAGES.OVERVIEW,
            name: i18n.translate('xpack.ml.navMenu.overviewTabLinkText', {
              defaultMessage: 'Overview',
            }),
            disabled: disableLinks,
            testSubj: 'mlMainTab overview',
          },
        ],
      },
      {
        id: 'anomaly_detection_section',
        name: i18n.translate('xpack.ml.navMenu.anomalyDetectionTabLinkText', {
          defaultMessage: 'Anomaly Detection',
        }),
        items: [
          {
            id: 'anomaly_detection',
            name: i18n.translate('xpack.ml.navMenu.anomalyDetection.jobsManagementText', {
              defaultMessage: 'Jobs management',
            }),
            disabled: disableLinks,
            pathId: ML_PAGES.ANOMALY_DETECTION_JOBS_MANAGE,
            testSubj: 'mlMainTab anomalyDetection',
          },
          {
            id: 'anomaly_explorer',
            name: i18n.translate('xpack.ml.navMenu.anomalyDetection.anomalyExplorerText', {
              defaultMessage: 'Anomaly Explorer',
            }),
            disabled: disableLinks,
            pathId: ML_PAGES.ANOMALY_EXPLORER,
            testSubj: 'mlMainTab anomalyExplorer',
          },
          {
            id: 'single_metric_viewer',
            name: i18n.translate('xpack.ml.navMenu.anomalyDetection.singleMetricViewerText', {
              defaultMessage: 'Single Metric Viewer',
            }),
            pathId: ML_PAGES.SINGLE_METRIC_VIEWER,
            disabled: disableLinks,
          },
          {
            id: 'settings',
            pathId: ML_PAGES.SETTINGS,
            name: i18n.translate('xpack.ml.navMenu.settingsTabLinkText', {
              defaultMessage: 'Settings',
            }),
            disabled: disableLinks,
            testSubj: 'mlMainTab settings',
            highlightNestedRoutes: true,
          },
        ],
      },
      {
        id: 'data_frame_analytics_section',
        name: i18n.translate('xpack.ml.navMenu.dataFrameAnalyticsTabLinkText', {
          defaultMessage: 'Data Frame Analytics',
        }),
        disabled: disableLinks,
        items: [
          {
            id: 'data_frame_analytics_jobs',
            pathId: ML_PAGES.DATA_FRAME_ANALYTICS_JOBS_MANAGE,
            name: i18n.translate('xpack.ml.navMenu.dataFrameAnalytics.jobsManagementText', {
              defaultMessage: 'Jobs management',
            }),
            disabled: disableLinks,
            testSubj: 'mlMainTab dataFrameAnalytics',
          },
        ],
      },
      {
        id: 'model_management',
        name: i18n.translate('xpack.ml.navMenu.modelManagementText', {
          defaultMessage: 'Model Management',
        }),
        disabled: disableLinks,
        items: [
          {
            id: 'trained_models',
            pathId: ML_PAGES.TRAINED_MODELS_MANAGE,
            name: i18n.translate('xpack.ml.navMenu.trainedModelsText', {
              defaultMessage: 'Trained Models',
            }),
            disabled: disableLinks,
            testSubj: 'mlMainTab trainedModels',
          },
          {
            id: 'nodes_overview',
            pathId: ML_PAGES.TRAINED_MODELS_NODES,
            name: i18n.translate('xpack.ml.navMenu.nodesOverviewText', {
              defaultMessage: 'Nodes Overview',
            }),
            disabled: disableLinks,
            testSubj: 'mlMainTab nodesOverview',
          },
        ],
      },
      {
        id: 'datavisualizer',
        name: i18n.translate('xpack.ml.navMenu.dataVisualizerTabLinkText', {
          defaultMessage: 'Data Visualizer',
        }),
        disabled: false,
        pathId: ML_PAGES.DATA_VISUALIZER,
        testSubj: 'mlMainTab dataVisualizer',
        items: [
          {
            id: 'filedatavisualizer',
            pathId: ML_PAGES.DATA_VISUALIZER_FILE,
            name: i18n.translate('xpack.ml.navMenu.fileDataVisualizerLinkText', {
              defaultMessage: 'File',
            }),
            disabled: false,
            testSubj: 'mlMainTab dataVisualizer fileDatavisualizer',
          },
          {
            id: 'data_view_datavisualizer',
            pathId: ML_PAGES.DATA_VISUALIZER_INDEX_SELECT,
            name: i18n.translate('xpack.ml.navMenu.dataViewDataVisualizerLinkText', {
              defaultMessage: 'Data View',
            }),
            disabled: false,
            testSubj: 'mlMainTab dataVisualizer dataViewDatavisualizer',
          },
        ],
      },
    ];
  }, [mlFeaturesDisabled]);

  const getTabItem: (tab: Tab) => EuiSideNavItemType<unknown> = useCallback(
    (tab: Tab) => {
      const { id, disabled, items, onClick, pathId, name, testSubj, highlightNestedRoutes } = tab;

      const onClickCallback = onClick ?? (pathId ? redirectToTab.bind(null, pathId) : undefined);

      const isSelected =
        `/${pathId}` === activeRoute?.path ||
        (!!highlightNestedRoutes && activeRoute?.path.includes(`${pathId}/`));

      return {
        id,
        name,
        isSelected,
        disabled,
        ...(onClickCallback ? { onClick: onClickCallback } : {}),
        'data-test-subj': testSubj + (isSelected ? ' selected' : ''),
        items: items ? items.map(getTabItem) : undefined,
        forceOpen: true,
      };
    },
    [activeRoute?.path]
  );

  return useMemo(() => tabsDefinition.map(getTabItem), [tabsDefinition, getTabItem]);
}
