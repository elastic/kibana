/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { NavigationTreeDefinition } from '@kbn/core-chrome-browser';

export const navigationTree: NavigationTreeDefinition = {
  body: [
    { type: 'recentlyAccessed' },
    {
      type: 'navGroup',
      id: 'observability_project_nav',
      title: 'Observability',
      icon: 'logoObservability',
      defaultIsCollapsed: false,
      isCollapsible: false,
      breadcrumbStatus: 'hidden',
      children: [
        {
          title: i18n.translate('xpack.serverlessObservability.nav.discover', {
            defaultMessage: 'Discover',
          }),
          link: 'last-used-logs-viewer',
          // avoid duplicate "Discover" breadcrumbs
          breadcrumbStatus: 'hidden',
          renderAs: 'item',
          children: [
            {
              link: 'discover',
              children: [
                {
                  link: 'observability-logs-explorer',
                },
              ],
            },
          ],
        },
        {
          title: i18n.translate('xpack.serverlessObservability.nav.dashboards', {
            defaultMessage: 'Dashboards',
          }),
          link: 'dashboards',
          getIsActive: ({ pathNameSerialized, prepend }) => {
            return pathNameSerialized.startsWith(prepend('/app/dashboards'));
          },
        },
        {
          link: 'observability-overview:alerts',
        },
        {
          link: 'observability-overview:cases',
          renderAs: 'item',
          children: [
            {
              link: 'observability-overview:cases_configure',
            },
            {
              link: 'observability-overview:cases_create',
            },
          ],
        },
        {
          title: i18n.translate('xpack.serverlessObservability.nav.slo', {
            defaultMessage: 'SLOs',
          }),
          link: 'slo',
        },
        {
          link: 'observabilityAIAssistant',
          title: i18n.translate('xpack.serverlessObservability.nav.aiAssistant', {
            defaultMessage: 'AI Assistant',
          }),
        },
        { link: 'inventory', spaceBefore: 'm' },
        {
          id: 'apm',
          title: i18n.translate('xpack.serverlessObservability.nav.applications', {
            defaultMessage: 'Applications',
          }),
          renderAs: 'panelOpener',
          children: [
            {
              children: [
                {
                  link: 'apm:services',
                  title: i18n.translate('xpack.serverlessObservability.nav.apm.services', {
                    defaultMessage: 'Service inventory',
                  }),
                },
                { link: 'apm:traces' },
                { link: 'apm:dependencies' },
                { link: 'apm:settings' },
                {
                  id: 'synthetics',
                  title: i18n.translate('xpack.serverlessObservability.nav.synthetics', {
                    defaultMessage: 'Synthetics',
                  }),
                  children: [
                    {
                      title: i18n.translate(
                        'xpack.serverlessObservability.nav.synthetics.overviewItem',
                        {
                          defaultMessage: 'Overview',
                        }
                      ),
                      id: 'synthetics-overview',
                      link: 'synthetics:overview',
                      breadcrumbStatus: 'hidden',
                    },
                    {
                      link: 'synthetics:certificates',
                      title: i18n.translate(
                        'xpack.serverlessObservability.nav.synthetics.certificatesItem',
                        {
                          defaultMessage: 'TLS certificates',
                        }
                      ),
                      id: 'synthetics-certificates',
                      breadcrumbStatus: 'hidden',
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          id: 'metrics',
          title: i18n.translate('xpack.serverlessObservability.nav.infrastructure', {
            defaultMessage: 'Infrastructure',
          }),
          renderAs: 'panelOpener',
          children: [
            {
              children: [
                {
                  link: 'metrics:inventory',
                  title: i18n.translate(
                    'xpack.serverlessObservability.nav.infrastructureInventory',
                    {
                      defaultMessage: 'Infrastructure inventory',
                    }
                  ),
                },
                { link: 'metrics:hosts' },
                { link: 'metrics:settings' },
                { link: 'metrics:assetDetails' },
              ],
            },
          ],
        },
        {
          id: 'machine_learning-landing',
          renderAs: 'panelOpener',
          title: i18n.translate('xpack.serverlessObservability.nav.machineLearning', {
            defaultMessage: 'Machine learning',
          }),
          children: [
            {
              children: [
                {
                  link: 'ml:overview',
                },
                {
                  link: 'ml:notifications',
                },
                {
                  link: 'ml:memoryUsage',
                  title: i18n.translate(
                    'xpack.serverlessObservability.nav.machineLearning.memoryUsage',
                    {
                      defaultMessage: 'Memory usage',
                    }
                  ),
                },
              ],
            },
            {
              id: 'category-anomaly_detection',
              title: i18n.translate('xpack.serverlessObservability.nav.ml.anomaly_detection', {
                defaultMessage: 'Anomaly detection',
              }),
              breadcrumbStatus: 'hidden',
              children: [
                {
                  link: 'ml:anomalyDetection',
                  title: i18n.translate(
                    'xpack.serverlessObservability.nav.ml.anomaly_detection.jobs',
                    {
                      defaultMessage: 'Jobs',
                    }
                  ),
                },
                {
                  link: 'ml:anomalyExplorer',
                },
                {
                  link: 'ml:singleMetricViewer',
                },
                {
                  link: 'ml:settings',
                },
                {
                  link: 'ml:suppliedConfigurations',
                },
              ],
            },
            {
              id: 'category-data_frame analytics',
              title: i18n.translate('xpack.serverlessObservability.nav.ml.data_frame_analytics', {
                defaultMessage: 'Data frame analytics',
              }),
              breadcrumbStatus: 'hidden',
              children: [
                {
                  link: 'ml:dataFrameAnalytics',
                  title: i18n.translate(
                    'xpack.serverlessObservability.nav.ml.data_frame_analytics.jobs',
                    {
                      defaultMessage: 'Jobs',
                    }
                  ),
                },
                {
                  link: 'ml:resultExplorer',
                },
                {
                  link: 'ml:analyticsMap',
                },
              ],
            },
            {
              id: 'category-model_management',
              title: i18n.translate('xpack.serverlessObservability.nav.ml.model_management', {
                defaultMessage: 'Model management',
              }),
              breadcrumbStatus: 'hidden',
              children: [
                {
                  link: 'ml:nodesOverview',
                  title: i18n.translate(
                    'xpack.serverlessObservability.nav.ml.model_management.trainedModels',
                    {
                      defaultMessage: 'Trained models',
                    }
                  ),
                },
              ],
            },
            {
              id: 'category-data_visualizer',
              title: i18n.translate('xpack.serverlessObservability.nav.ml.data_visualizer', {
                defaultMessage: 'Data visualizer',
              }),
              breadcrumbStatus: 'hidden',
              children: [
                {
                  link: 'ml:fileUpload',
                  title: i18n.translate(
                    'xpack.serverlessObservability.nav.ml.data_visualizer.file_data_visualizer',
                    {
                      defaultMessage: 'File data visualizer',
                    }
                  ),
                },
                {
                  link: 'ml:indexDataVisualizer',
                  title: i18n.translate(
                    'xpack.serverlessObservability.nav.ml.data_visualizer.data_view_data_visualizer',
                    {
                      defaultMessage: 'Data view data visualizer',
                    }
                  ),
                },
                {
                  link: 'ml:dataDrift',
                  title: i18n.translate(
                    'xpack.serverlessObservability.nav.ml.data_visualizer.data_drift',
                    {
                      defaultMessage: 'Data drift',
                    }
                  ),
                },
              ],
            },
            {
              id: 'category-aiops_labs',
              title: i18n.translate('xpack.serverlessObservability.nav.ml.aiops_labs', {
                defaultMessage: 'Aiops labs',
              }),
              breadcrumbStatus: 'hidden',
              children: [
                {
                  link: 'ml:logRateAnalysis',
                  title: i18n.translate(
                    'xpack.serverlessObservability.nav.ml.aiops_labs.log_rate_analysis',
                    {
                      defaultMessage: 'Log rate analysis',
                    }
                  ),
                },
                {
                  link: 'ml:logPatternAnalysis',
                  title: i18n.translate(
                    'xpack.serverlessObservability.nav.ml.aiops_labs.log_pattern_analysis',
                    {
                      defaultMessage: 'Log pattern analysis',
                    }
                  ),
                },
                {
                  link: 'ml:changePointDetections',
                  title: i18n.translate(
                    'xpack.serverlessObservability.nav.ml.aiops_labs.change_point_detection',
                    {
                      defaultMessage: 'Change point detection',
                    }
                  ),
                },
              ],
            },
          ],
        },
      ],
    },
  ],
  footer: [
    {
      type: 'navItem',
      title: i18n.translate('xpack.serverlessObservability.nav.getStarted', {
        defaultMessage: 'Add data',
      }),
      link: 'observabilityOnboarding',
      icon: 'launch',
    },
    {
      type: 'navItem',
      id: 'devTools',
      title: i18n.translate('xpack.serverlessObservability.nav.devTools', {
        defaultMessage: 'Developer tools',
      }),
      link: 'dev_tools',
      icon: 'editorCodeBlock',
    },
    {
      type: 'navGroup',
      id: 'project_settings_project_nav',
      title: i18n.translate('xpack.serverlessObservability.nav.projectSettings', {
        defaultMessage: 'Project settings',
      }),
      icon: 'gear',
      breadcrumbStatus: 'hidden',
      children: [
        {
          link: 'management',
          title: i18n.translate('xpack.serverlessObservability.nav.mngt', {
            defaultMessage: 'Management',
          }),
        },
        {
          link: 'integrations',
        },
        {
          link: 'fleet',
        },
        {
          id: 'cloudLinkUserAndRoles',
          cloudLink: 'userAndRoles',
        },
        {
          id: 'cloudLinkBilling',
          cloudLink: 'billingAndSub',
        },
      ],
    },
  ],
};
