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
          link: 'observability-logs-explorer',
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
          id: 'aiops',
          title: 'AIOps',
          link: 'ml:anomalyDetection',
          renderAs: 'accordion',
          spaceBefore: null,
          children: [
            {
              title: i18n.translate('xpack.serverlessObservability.nav.ml.jobs', {
                defaultMessage: 'Anomaly detection',
              }),
              link: 'ml:anomalyDetection',
              id: 'ml:anomalyDetection',
              renderAs: 'item',
              children: [
                {
                  link: 'ml:singleMetricViewer',
                },
                {
                  link: 'ml:anomalyExplorer',
                },
                {
                  link: 'ml:settings',
                },
              ],
            },
            {
              title: i18n.translate('xpack.serverlessObservability.ml.logRateAnalysis', {
                defaultMessage: 'Log rate analysis',
              }),
              link: 'ml:logRateAnalysis',
              getIsActive: ({ pathNameSerialized, prepend }) => {
                return pathNameSerialized.includes(prepend('/app/ml/aiops/log_rate_analysis'));
              },
            },
            {
              title: i18n.translate('xpack.serverlessObservability.ml.changePointDetection', {
                defaultMessage: 'Change point detection',
              }),
              link: 'ml:changePointDetections',
              getIsActive: ({ pathNameSerialized, prepend }) => {
                return pathNameSerialized.includes(prepend('/app/ml/aiops/change_point_detection'));
              },
            },
            {
              title: i18n.translate('xpack.serverlessObservability.nav.ml.job.notifications', {
                defaultMessage: 'Job notifications',
              }),
              link: 'ml:notifications',
            },
          ],
        },
        { link: 'inventory', spaceBefore: 'm' },
        {
          id: 'apm',
          title: i18n.translate('xpack.serverlessObservability.nav.applications', {
            defaultMessage: 'Applications',
          }),
          // link: 'apm:services',
          renderAs: 'panelOpener',
          children: [
            {
              children: [
                { link: 'apm:services' },
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
                          defaultMessage: 'TLS Certificates',
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
          // link: 'metrics:inventory',
          renderAs: 'panelOpener',
          children: [
            {
              children: [
                { link: 'metrics:inventory' },
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
          title: i18n.translate('xpack.observability.obltNav.machineLearning', {
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
                    'xpack.observability.obltNav.machineLearning.memoryUsage',
                    {
                      defaultMessage: 'Memory usage',
                    }
                  ),
                },
              ],
            },
            {
              id: 'category-anomaly_detection',
              title: i18n.translate('xpack.observability.obltNav.ml.anomaly_detection', {
                defaultMessage: 'Anomaly detection',
              }),
              breadcrumbStatus: 'hidden',
              children: [
                {
                  link: 'ml:anomalyDetection',
                  title: i18n.translate('xpack.observability.obltNav.ml.anomaly_detection.jobs', {
                    defaultMessage: 'Jobs',
                  }),
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
              title: i18n.translate('xpack.observability.obltNav.ml.data_frame_analytics', {
                defaultMessage: 'Data frame analytics',
              }),
              breadcrumbStatus: 'hidden',
              children: [
                {
                  link: 'ml:dataFrameAnalytics',
                  title: i18n.translate(
                    'xpack.observability.obltNav.ml.data_frame_analytics.jobs',
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
              title: i18n.translate('xpack.observability.obltNav.ml.model_management', {
                defaultMessage: 'Model management',
              }),
              breadcrumbStatus: 'hidden',
              children: [
                {
                  link: 'ml:nodesOverview',
                  title: i18n.translate(
                    'xpack.observability.obltNav.ml.model_management.trainedModels',
                    {
                      defaultMessage: 'Trained models',
                    }
                  ),
                },
              ],
            },
            {
              id: 'category-data_visualizer',
              title: i18n.translate('xpack.observability.obltNav.ml.data_visualizer', {
                defaultMessage: 'Data visualizer',
              }),
              breadcrumbStatus: 'hidden',
              children: [
                {
                  link: 'ml:fileUpload',
                  title: i18n.translate(
                    'xpack.observability.obltNav.ml.data_visualizer.file_data_visualizer',
                    {
                      defaultMessage: 'File data visualizer',
                    }
                  ),
                },
                {
                  link: 'ml:indexDataVisualizer',
                  title: i18n.translate(
                    'xpack.observability.obltNav.ml.data_visualizer.data_view_data_visualizer',
                    {
                      defaultMessage: 'Data view data visualizer',
                    }
                  ),
                },
                {
                  link: 'ml:dataDrift',
                  title: i18n.translate(
                    'xpack.observability.obltNav.ml.data_visualizer.data_drift',
                    {
                      defaultMessage: 'Data drift',
                    }
                  ),
                },
              ],
            },
            {
              id: 'category-aiops_labs',
              title: i18n.translate('xpack.observability.obltNav.ml.aiops_labs', {
                defaultMessage: 'Aiops labs',
              }),
              breadcrumbStatus: 'hidden',
              children: [
                {
                  link: 'ml:logRateAnalysis',
                  title: i18n.translate(
                    'xpack.observability.obltNav.ml.aiops_labs.log_rate_analysis',
                    {
                      defaultMessage: 'Log rate analysis',
                    }
                  ),
                },
                {
                  link: 'ml:logPatternAnalysis',
                  title: i18n.translate(
                    'xpack.observability.obltNav.ml.aiops_labs.log_pattern_analysis',
                    {
                      defaultMessage: 'Log pattern analysis',
                    }
                  ),
                },
                {
                  link: 'ml:changePointDetections',
                  title: i18n.translate(
                    'xpack.observability.obltNav.ml.aiops_labs.change_point_detection',
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
