/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
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
    label: i18n.translate('xpack.infra.homePageMetrics.hostLabel', {
      defaultMessage: 'Host',
    }),
    sections: [
      {
        id: InfraMetric.hostSystemOverview,
        linkToId: 'hostOverview',
        label: i18n.translate('xpack.infra.homePageMetrics.innerHostOverviewLabel', {
          defaultMessage: 'Overview',
        }),
        requires: ['system.cpu', 'system.load', 'system.memory', 'system.network'],
        type: InfraMetricLayoutSectionType.gauges,
        visConfig: {
          seriesOverrides: {
            cpu: {
              name: i18n.translate('xpack.infra.homePageMetrics.innerHostOverviewCPUUsageName', {
                defaultMessage: 'CPU Usage',
              }),
              color: theme.eui.euiColorFullShade,
              formatter: InfraFormatterType.percent,
              gaugeMax: 1,
            },
            load: {
              name: i18n.translate(
                'xpack.infra.homePageMetrics.innerHostOverviewFiveMinuteLoadName',
                {
                  defaultMessage: 'Load (5m)',
                }
              ),
              color: theme.eui.euiColorFullShade,
            },
            memory: {
              name: i18n.translate('xpack.infra.homePageMetrics.innerHostOverviewMemoryUsageName', {
                defaultMessage: 'Memory Usage',
              }),
              color: theme.eui.euiColorFullShade,
              formatter: InfraFormatterType.percent,
              gaugeMax: 1,
            },
            rx: {
              name: i18n.translate('xpack.infra.homePageMetrics.innerHostOverviewInboundName', {
                defaultMessage: 'Inbound (RX)',
              }),
              color: theme.eui.euiColorFullShade,
              formatter: InfraFormatterType.bits,
              formatterTemplate: '{{value}}/s',
            },
            tx: {
              name: i18n.translate('xpack.infra.homePageMetrics.innerHostOverviewOutboundName', {
                defaultMessage: 'Outbound (RX)',
              }),
              color: theme.eui.euiColorFullShade,
              formatter: InfraFormatterType.bits,
              formatterTemplate: '{{value}}/s',
            },
          },
        },
      },
      {
        id: InfraMetric.hostCpuUsage,
        label: i18n.translate('xpack.infra.homePageMetrics.innerHostCPUUsageLabel', {
          defaultMessage: 'CPU Usage',
        }),
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
        label: i18n.translate('xpack.infra.homePageMetrics.innerHostLoadLabel', {
          defaultMessage: 'Load',
        }),
        requires: ['system.load'],
        type: InfraMetricLayoutSectionType.chart,
        visConfig: {
          seriesOverrides: {
            load_1m: {
              color: theme.eui.euiColorVis0,
              name: i18n.translate('xpack.infra.homePageMetrics.innerHostLoadOneMinuteName', {
                defaultMessage: '1m',
              }),
            },
            load_5m: {
              color: theme.eui.euiColorVis1,
              name: i18n.translate('xpack.infra.homePageMetrics.innerHostLoadFiveMinuteName', {
                defaultMessage: '5m',
              }),
            },
            load_15m: {
              color: theme.eui.euiColorVis3,
              name: i18n.translate('xpack.infra.homePageMetrics.innerHostLoadFifteenMinuteName', {
                defaultMessage: '15m',
              }),
            },
          },
        },
      },
      {
        id: InfraMetric.hostMemoryUsage,
        label: i18n.translate('xpack.infra.homePageMetrics.innerHostMemoryUsageLabel', {
          defaultMessage: 'MemoryUsage',
        }),
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
        label: i18n.translate('xpack.infra.homePageMetrics.innerHostNetworkTrafficLabel', {
          defaultMessage: 'Network Traffic',
        }),
        requires: ['system.network'],
        type: InfraMetricLayoutSectionType.chart,
        visConfig: {
          formatter: InfraFormatterType.bits,
          formatterTemplate: '{{value}}/s',
          type: InfraMetricLayoutVisualizationType.area,
          seriesOverrides: {
            rx: {
              color: theme.eui.euiColorVis1,
              name: i18n.translate('xpack.infra.homePageMetrics.innerHostNetworkTrafficInRXName', {
                defaultMessage: 'in',
              }),
            },
            tx: {
              color: theme.eui.euiColorVis2,
              name: i18n.translate('xpack.infra.homePageMetrics.innerHostNetworkTrafficOutTXName', {
                defaultMessage: 'out',
              }),
            },
          },
        },
      },
    ],
  },
  {
    id: 'k8sOverview',
    label: i18n.translate('xpack.infra.homePageMetrics.kubernetesLabel', {
      defaultMessage: 'Kubernetes',
    }),
    sections: [
      {
        id: InfraMetric.hostK8sOverview,
        linkToId: 'k8sOverview',
        label: i18n.translate('xpack.infra.homePageMetrics.innerKubernetesOverviewLabel', {
          defaultMessage: 'Overview',
        }),
        requires: ['kubernetes.node'],
        type: InfraMetricLayoutSectionType.gauges,
        visConfig: {
          seriesOverrides: {
            cpucap: {
              name: i18n.translate(
                'xpack.infra.homePageMetrics.innerKubernetesOverviewCPUCapacityName',
                {
                  defaultMessage: 'CPU Capacity',
                }
              ),
              color: 'secondary',
              formatter: InfraFormatterType.percent,
              gaugeMax: 1,
            },
            load: {
              name: i18n.translate('xpack.infra.homePageMetrics.innerKubernetesOverviewLoadName', {
                defaultMessage: 'Load (5m)',
              }),
              color: 'secondary',
            },
            memorycap: {
              name: i18n.translate(
                'xpack.infra.homePageMetrics.innerKubernetesOverviewMemoryCapacityName',
                {
                  defaultMessage: 'Memory Capacity',
                }
              ),
              color: 'secondary',
              formatter: InfraFormatterType.percent,
              gaugeMax: 1,
            },
            podcap: {
              name: i18n.translate(
                'xpack.infra.homePageMetrics.innerKubernetesOverviewPodCapacityName',
                {
                  defaultMessage: 'Pod Capacity',
                }
              ),
              color: 'secondary',
              formatter: InfraFormatterType.percent,
              gaugeMax: 1,
            },
            diskcap: {
              name: i18n.translate(
                'xpack.infra.homePageMetrics.innerKubernetesOverviewDiskCapacityName',
                {
                  defaultMessage: 'Disk Capacity',
                }
              ),
              color: 'secondary',
              formatter: InfraFormatterType.percent,
              gaugeMax: 1,
            },
          },
        },
      },
      {
        id: InfraMetric.hostK8sCpuCap,
        label: i18n.translate('xpack.infra.homePageMetrics.innerKubernetesNodeCPUCapacityLabel', {
          defaultMessage: 'Node CPU Capacity',
        }),
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
        label: i18n.translate(
          'xpack.infra.homePageMetrics.innerKubernetesNodeMemoryCapacityLabel',
          {
            defaultMessage: 'Node Memory Capacity',
          }
        ),
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
        label: i18n.translate('xpack.infra.homePageMetrics.innerKubernetesNodeDiskCapacityLabel', {
          defaultMessage: 'Node Disk Capacity',
        }),
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
        label: i18n.translate('xpack.infra.homePageMetrics.innerKubernetesNodePodCapacityLabel', {
          defaultMessage: 'Node Pod Capacity',
        }),
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
