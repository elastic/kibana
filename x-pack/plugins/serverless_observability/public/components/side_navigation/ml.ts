/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NodeDefinitionWithChildren } from '@kbn/shared-ux-chrome-navigation';

export type ID =
  | 'sharedux:ml'
  | 'root'
  | 'overview'
  | 'notifications'
  | 'anomaly_detection'
  | 'jobs'
  | 'explorer'
  | 'single_metric_viewer'
  | 'settings'
  | 'data_frame_analytics'
  | 'results_explorer'
  | 'analytics_map'
  | 'model_management'
  | 'trained_models'
  | 'nodes'
  | 'data_visualizer'
  | 'file'
  | 'data_view'
  | 'aiops_labs'
  | 'explain_log_rate_spikes'
  | 'log_pattern_analysis'
  | 'change_point_detection';

export const ml: NodeDefinitionWithChildren<ID> = {
  id: 'sharedux:ml',
  title: 'Machine learning',
  icon: 'machineLearningApp',
  children: [
    {
      title: '',
      id: 'root',
      children: [
        // {
        //   id: 'overview',
        //   title: 'Overview',
        //   href: '/app/ml/overview',
        // },
        {
          id: 'notifications',
          title: 'Notifications',
          href: '/app/ml/notifications',
        },
      ],
    },
    {
      title: 'Anomaly detection',
      id: 'anomaly_detection',
      children: [
        {
          id: 'jobs',
          title: 'Jobs',
          href: '/app/ml/jobs',
        },
        {
          id: 'explorer',
          title: 'Anomaly explorer',
          href: '/app/ml/explorer',
        },
        {
          id: 'single_metric_viewer',
          title: 'Single metric viewer',
          href: '/app/ml/timeseriesexplorer',
        },
        {
          id: 'settings',
          title: 'Settings',
          href: '/app/ml/settings',
        },
      ],
    },
    {
      id: 'data_visualizer',
      title: 'Data visualizer',
      children: [
        {
          id: 'file',
          title: 'File',
          href: '/app/ml/filedatavisualizer',
        },
        {
          id: 'data_view',
          title: 'Data view',
          href: '/app/ml/datavisualizer_index_select',
        },
      ],
    },
    {
      id: 'aiops_labs',
      title: 'AIOps labs',
      children: [
        {
          id: 'explain_log_rate_spikes',
          title: 'Explain log rate spikes',
          href: '/app/ml/aiops/explain_log_rate_spikes_index_select',
        },
        {
          id: 'log_pattern_analysis',
          title: 'Log pattern analysis',
          href: '/app/ml/aiops/log_categorization_index_select',
        },
        {
          id: 'change_point_detection',
          title: 'Change Point Detection',
          href: '/app/ml/aiops/change_point_detection_index_select',
        },
      ],
    },
  ],
};
