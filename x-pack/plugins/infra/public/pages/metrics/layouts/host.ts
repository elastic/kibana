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

export const hostLayoutCreator: InfraMetricLayoutCreator = theme => [
  {
    id: 'hostOverview',
    label: 'Host',
    sections: [
      {
        id: InfraMetric.hostSystemOverview,
        linkToId: 'hostOverview',
        label: 'Overview',
        requires: ['system.cpu', 'system.load', 'system.memory', 'system.network'],
        type: InfraMetricLayoutSectionType.gauges,
        visConfig: {
          seriesOverrides: {
            cpu: {
              name: 'CPU Usage',
              color: theme.eui.euiColorFullShade,
              formatter: InfraFormatterType.percent,
              gaugeMax: 1,
            },
            load: { name: 'Load (5m)', color: theme.eui.euiColorFullShade },
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
        id: InfraMetric.hostCpuUsage,
        label: 'CPU Usage',
        requires: ['system.cpu'],
        type: InfraMetricLayoutSectionType.chart,
        visConfig: {
          stacked: true,
          type: InfraMetricLayoutVisualizationType.area,
          formatter: InfraFormatterType.percent,
          bounds: { min: 0, max: 1 },
          seriesOverrides: {
            user: { color: theme.eui.euiColorVis0 },
            system: { color: theme.eui.euiColorVis2 },
            steal: { color: theme.eui.euiColorVis9 },
            irq: { color: theme.eui.euiColorVis4 },
            softirq: { color: theme.eui.euiColorVis6 },
            iowait: { color: theme.eui.euiColorVis7 },
            nice: { color: theme.eui.euiColorVis5 },
          },
        },
      },
      {
        id: InfraMetric.hostLoad,
        label: 'Load',
        requires: ['system.load'],
        type: InfraMetricLayoutSectionType.chart,
        visConfig: {
          seriesOverrides: {
            load_1m: { color: theme.eui.euiColorVis0, name: '1m' },
            load_5m: { color: theme.eui.euiColorVis1, name: '5m' },
            load_15m: { color: theme.eui.euiColorVis3, name: '15m' },
          },
        },
      },
      {
        id: InfraMetric.hostMemoryUsage,
        label: 'MemoryUsage',
        requires: ['system.memory'],
        type: InfraMetricLayoutSectionType.chart,
        visConfig: {
          stacked: true,
          formatter: InfraFormatterType.bytes,
          type: InfraMetricLayoutVisualizationType.area,
          seriesOverrides: {
            used: { color: theme.eui.euiColorVis2 },
            free: { color: theme.eui.euiColorVis0 },
            cache: { color: theme.eui.euiColorVis1 },
          },
        },
      },
      {
        id: InfraMetric.hostNetworkTraffic,
        label: 'Network Traffic',
        requires: ['system.network'],
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
  {
    id: 'k8sOverview',
    label: 'Kubernetes',
    sections: [
      {
        id: InfraMetric.hostK8sOverview,
        linkToId: 'k8sOverview',
        label: 'Overview',
        requires: ['kubernetes.node'],
        type: InfraMetricLayoutSectionType.gauges,
        visConfig: {
          seriesOverrides: {
            cpucap: {
              name: 'CPU Capacity',
              color: 'secondary',
              formatter: InfraFormatterType.percent,
              gaugeMax: 1,
            },
            load: { name: 'Load (5m)', color: 'secondary' },
            memorycap: {
              name: 'Memory Capacity',
              color: 'secondary',
              formatter: InfraFormatterType.percent,
              gaugeMax: 1,
            },
            podcap: {
              name: 'Pod Capacity',
              color: 'secondary',
              formatter: InfraFormatterType.percent,
              gaugeMax: 1,
            },
            diskcap: {
              name: 'Disk Capacity',
              color: 'secondary',
              formatter: InfraFormatterType.percent,
              gaugeMax: 1,
            },
          },
        },
      },
      {
        id: InfraMetric.hostK8sCpuCap,
        label: 'Node CPU Capacity',
        requires: ['kubernetes.node'],
        type: InfraMetricLayoutSectionType.chart,
        visConfig: {
          formatter: InfraFormatterType.abbreviatedNumber,
          seriesOverrides: {
            capacity: { color: theme.eui.euiColorVis2 },
            used: { color: theme.eui.euiColorVis1, type: InfraMetricLayoutVisualizationType.area },
          },
        },
      },
      {
        id: InfraMetric.hostK8sMemoryCap,
        label: 'Node Memory Capacity',
        requires: ['kubernetes.node'],
        type: InfraMetricLayoutSectionType.chart,
        visConfig: {
          formatter: InfraFormatterType.bytes,
          seriesOverrides: {
            capacity: { color: theme.eui.euiColorVis2 },
            used: { color: theme.eui.euiColorVis1, type: InfraMetricLayoutVisualizationType.area },
          },
        },
      },
      {
        id: InfraMetric.hostK8sDiskCap,
        label: 'Node Disk Capacity',
        requires: ['kubernetes.node'],
        type: InfraMetricLayoutSectionType.chart,
        visConfig: {
          formatter: InfraFormatterType.bytes,
          seriesOverrides: {
            capacity: { color: theme.eui.euiColorVis2 },
            used: { color: theme.eui.euiColorVis1, type: InfraMetricLayoutVisualizationType.area },
          },
        },
      },
      {
        id: InfraMetric.hostK8sPodCap,
        label: 'Node Pod Capacity',
        requires: ['kubernetes.node'],
        type: InfraMetricLayoutSectionType.chart,
        visConfig: {
          formatter: InfraFormatterType.number,
          seriesOverrides: {
            capacity: { color: theme.eui.euiColorVis2 },
            used: { color: theme.eui.euiColorVis1, type: InfraMetricLayoutVisualizationType.area },
          },
        },
      },
    ],
  },
  ...nginxLayoutCreator(theme),
];
