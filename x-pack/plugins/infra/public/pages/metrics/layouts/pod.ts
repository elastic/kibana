/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraMetric } from '../../../../common/graphql/types';
import { InfraFormatterType } from '../../../lib/lib';
import { nginxLayoutCreator } from './nginx';
import {
  InfraMetricLayoutCreator,
  InfraMetricLayoutSectionType,
  InfraMetricLayoutVisualizationType,
} from './types';

export const podLayoutCreator: InfraMetricLayoutCreator = theme => [
  {
    id: 'podOverview',
    label: 'Pod Overview',
    sections: [
      {
        id: InfraMetric.podOverview,
        label: 'Pod Overview',
        requires: ['kubernetes.pod'],
        type: InfraMetricLayoutSectionType.gauges,
        visConfig: {
          seriesOverrides: {
            cpu: {
              name: 'CPU Usage',
              color: theme.eui.euiColorFullShade,
              formatter: InfraFormatterType.percent,
              gaugeMax: 1,
            },
            memory: {
              name: 'Memory Usage',
              color: theme.eui.euiColorFullShade,
              formatter: InfraFormatterType.percent,
              gaugeMax: 1,
            },
            rx: {
              name: 'Inbound (RX)',
              color: theme.eui.euiColorFullShade,
              formatter: InfraFormatterType.bits,
              formatterTemplate: '{{value}}/s',
            },
            tx: {
              name: 'Outbound (RX)',
              color: theme.eui.euiColorFullShade,
              formatter: InfraFormatterType.bits,
              formatterTemplate: '{{value}}/s',
            },
          },
        },
      },
      {
        id: InfraMetric.podCpuUsage,
        label: 'CPU Usage',
        requires: ['kubernetes.pod'],
        type: InfraMetricLayoutSectionType.chart,
        visConfig: {
          formatter: InfraFormatterType.percent,
          seriesOverrides: {
            cpu: { color: theme.eui.euiColorVis1, type: InfraMetricLayoutVisualizationType.area },
          },
        },
      },
      {
        id: InfraMetric.podMemoryUsage,
        label: 'Memory Usage',
        requires: ['kubernetes.pod'],
        type: InfraMetricLayoutSectionType.chart,
        visConfig: {
          formatter: InfraFormatterType.percent,
          seriesOverrides: {
            memory: {
              color: theme.eui.euiColorVis1,
              type: InfraMetricLayoutVisualizationType.area,
            },
          },
        },
      },
      {
        id: InfraMetric.podNetworkTraffic,
        label: 'Network Traffic',
        requires: ['kubernetes.pod'],
        type: InfraMetricLayoutSectionType.chart,
        visConfig: {
          formatter: InfraFormatterType.bits,
          formatterTemplate: '{{value}}/s',
          type: InfraMetricLayoutVisualizationType.area,
          seriesOverrides: {
            rx: { color: theme.eui.euiColorVis1, name: 'in' },
            tx: { color: theme.eui.euiColorVis2, name: 'out' },
          },
        },
      },
    ],
  },
  ...nginxLayoutCreator(theme),
];
