/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { EuiSideNavItemType } from '@elastic/eui';
import React, { ReactNode, useCallback, useMemo } from 'react';
import { AIOPS_ENABLED, CHANGE_POINT_DETECTION_ENABLED } from '@kbn/aiops-plugin/common';
import { useUrlState } from '@kbn/ml-url-state';
import { NotificationsIndicator } from './notifications_indicator';
import type { MlLocatorParams } from '../../../../common/types/locator';
import { useMlLocator, useNavigateToPath } from '../../contexts/kibana';
import { isFullLicense } from '../../license';
import type { MlRoute } from '../../routing';
import { ML_PAGES } from '../../../../common/constants/locator';
import { checkPermission } from '../../capabilities/check_capabilities';

export interface Tab {
  id: string;
  name: ReactNode;
  disabled?: boolean;
  items?: Tab[];
  testSubj?: string;
  pathId?: MlLocatorParams['page'];
  onClick?: () => Promise<void>;
  /** Indicates if item should be marked as active with nested routes */
  highlightNestedRoutes?: boolean;
  /** List of route IDs related to the side nav entry */
  relatedRouteIds?: string[];
}

export function useSideNavItems(activeRoute: MlRoute | undefined) {
  const mlLocator = useMlLocator();
  const navigateToPath = useNavigateToPath();

  const mlFeaturesDisabled = !isFullLicense();
  const canViewMlNodes = checkPermission('canViewMlNodes');

  const [globalState] = useUrlState('_g');

  const pageState = useMemo(() => {
    return globalState?.refreshInterval !== undefined
      ? {
          globalState: {
            refreshInterval: globalState.refreshInterval,
          },
        }
      : undefined;
  }, [globalState?.refreshInterval]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pageState]
  );

  const tabsDefinition: Tab[] = useMemo((): Tab[] => {
    const disableLinks = mlFeaturesDisabled;

    const mlTabs: Tab[] = [
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
          {
            id: 'notifications',
            pathId: ML_PAGES.NOTIFICATIONS,
            name: disableLinks ? (
              i18n.translate('xpack.ml.navMenu.notificationsTabLinkText', {
                defaultMessage: 'Notifications',
              })
            ) : (
              <NotificationsIndicator />
            ),
            disabled: disableLinks,
            testSubj: 'mlMainTab notifications',
          },
        ],
      },
      {
        id: 'anomaly_detection_section',
        name: i18n.translate('xpack.ml.navMenu.anomalyDetectionTabLinkText', {
          defaultMessage: 'Anomaly Detection',
        }),
        disabled: disableLinks,
        items: [
          {
            id: 'anomaly_detection',
            name: i18n.translate('xpack.ml.navMenu.anomalyDetection.jobsManagementText', {
              defaultMessage: 'Jobs',
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
            testSubj: 'mlMainTab singleMetricViewer',
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
              defaultMessage: 'Jobs',
            }),
            disabled: disableLinks,
            testSubj: 'mlMainTab dataFrameAnalytics',
          },
          {
            id: 'data_frame_analytics_results_explorer',
            pathId: ML_PAGES.DATA_FRAME_ANALYTICS_EXPLORATION,
            name: i18n.translate('xpack.ml.navMenu.dataFrameAnalytics.resultsExplorerText', {
              defaultMessage: 'Results Explorer',
            }),
            disabled: disableLinks,
            testSubj: 'mlMainTab dataFrameAnalyticsResultsExplorer',
          },
          {
            id: 'data_frame_analytics_job_map',
            pathId: ML_PAGES.DATA_FRAME_ANALYTICS_MAP,
            name: i18n.translate('xpack.ml.navMenu.dataFrameAnalytics.analyticsMapText', {
              defaultMessage: 'Analytics Map',
            }),
            disabled: disableLinks,
            testSubj: 'mlMainTab dataFrameAnalyticsMap',
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
              defaultMessage: 'Nodes',
            }),
            disabled: disableLinks || !canViewMlNodes,
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
            testSubj: 'mlMainTab fileDataVisualizer',
          },
          {
            id: 'data_view_datavisualizer',
            pathId: ML_PAGES.DATA_VISUALIZER_INDEX_SELECT,
            name: i18n.translate('xpack.ml.navMenu.dataViewDataVisualizerLinkText', {
              defaultMessage: 'Data View',
            }),
            disabled: false,
            testSubj: 'mlMainTab indexDataVisualizer',
          },
        ],
      },
    ];

    if (AIOPS_ENABLED) {
      mlTabs.push({
        id: 'aiops_section',
        name: i18n.translate('xpack.ml.navMenu.aiopsTabLinkText', {
          defaultMessage: 'AIOps Labs',
        }),
        disabled: disableLinks,
        items: [
          {
            id: 'explainlogratespikes',
            pathId: ML_PAGES.AIOPS_EXPLAIN_LOG_RATE_SPIKES_INDEX_SELECT,
            name: i18n.translate('xpack.ml.navMenu.explainLogRateSpikesLinkText', {
              defaultMessage: 'Explain Log Rate Spikes',
            }),
            disabled: disableLinks,
            testSubj: 'mlMainTab explainLogRateSpikes',
            relatedRouteIds: ['explain_log_rate_spikes'],
          },
          {
            id: 'logCategorization',
            pathId: ML_PAGES.AIOPS_LOG_CATEGORIZATION_INDEX_SELECT,
            name: i18n.translate('xpack.ml.navMenu.logCategorizationLinkText', {
              defaultMessage: 'Log Pattern Analysis',
            }),
            disabled: disableLinks,
            testSubj: 'mlMainTab logCategorization',
            relatedRouteIds: ['log_categorization'],
          },
          ...(CHANGE_POINT_DETECTION_ENABLED
            ? [
                {
                  id: 'changePointDetection',
                  pathId: ML_PAGES.AIOPS_CHANGE_POINT_DETECTION_INDEX_SELECT,
                  name: i18n.translate('xpack.ml.navMenu.changePointDetectionLinkText', {
                    defaultMessage: 'Change Point Detection',
                  }),
                  disabled: disableLinks,
                  testSubj: 'mlMainTab changePointDetection',
                  relatedRouteIds: ['change_point_detection'],
                },
              ]
            : []),
        ],
      });
    }

    return mlTabs;
  }, [mlFeaturesDisabled, canViewMlNodes]);

  const getTabItem: (tab: Tab) => EuiSideNavItemType<unknown> = useCallback(
    (tab: Tab) => {
      const {
        id,
        disabled,
        items,
        onClick,
        pathId,
        name,
        testSubj,
        highlightNestedRoutes,
        relatedRouteIds,
      } = tab;

      const onClickCallback = onClick ?? (pathId ? redirectToTab.bind(null, pathId) : undefined);

      const isSelected =
        `/${pathId}` === activeRoute?.path ||
        (!!highlightNestedRoutes && activeRoute?.path.includes(`${pathId}/`)) ||
        (Array.isArray(relatedRouteIds) && relatedRouteIds.includes(activeRoute?.id!));

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
    [activeRoute, redirectToTab]
  );

  return useMemo(() => tabsDefinition.map(getTabItem), [tabsDefinition, getTabItem]);
}
