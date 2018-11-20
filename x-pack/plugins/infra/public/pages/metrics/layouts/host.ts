/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

<<<<<<< HEAD
=======
import { i18n } from '@kbn/i18n';
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
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
<<<<<<< HEAD
    label: 'Host',
=======
    label: i18n.translate('xpack.infra.metricDetailPage.hostMetricsLayout.layoutLabel', {
      defaultMessage: 'Host',
    }),
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
    sections: [
      {
        id: InfraMetric.hostSystemOverview,
        linkToId: 'hostOverview',
<<<<<<< HEAD
        label: 'Overview',
=======
        label: i18n.translate(
          'xpack.infra.metricDetailPage.hostMetricsLayout.overviewSection.sectionLabel',
          {
            defaultMessage: 'Overview',
          }
        ),
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
        requires: ['system.cpu', 'system.load', 'system.memory', 'system.network'],
        type: InfraMetricLayoutSectionType.gauges,
        visConfig: {
          seriesOverrides: {
            cpu: {
<<<<<<< HEAD
              name: 'CPU Usage',
=======
              name: i18n.translate(
                'xpack.infra.metricDetailPage.hostMetricsLayout.overviewSection.cpuUsageSeriesLabel',
                {
                  defaultMessage: 'CPU Usage',
                }
              ),
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
              color: theme.eui.euiColorFullShade,
              formatter: InfraFormatterType.percent,
              gaugeMax: 1,
            },
<<<<<<< HEAD
            load: { name: 'Load (5m)', color: theme.eui.euiColorFullShade },
            memory: {
              name: 'Memory Usage',
=======
            load: {
              name: i18n.translate(
                'xpack.infra.metricDetailPage.hostMetricsLayout.overviewSection.loadSeriesLabel',
                {
                  defaultMessage: 'Load (5m)',
                }
              ),
              color: theme.eui.euiColorFullShade,
            },
            memory: {
              name: i18n.translate(
                'xpack.infra.metricDetailPage.hostMetricsLayout.overviewSection.memoryCapacitySeriesLabel',
                {
                  defaultMessage: 'Memory Usage',
                }
              ),
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
              color: theme.eui.euiColorFullShade,
              formatter: InfraFormatterType.percent,
              gaugeMax: 1,
            },
            rx: {
<<<<<<< HEAD
              name: 'Inbound (RX)',
=======
              name: i18n.translate(
                'xpack.infra.metricDetailPage.hostMetricsLayout.overviewSection.inboundRXSeriesLabel',
                {
                  defaultMessage: 'Inbound (RX)',
                }
              ),
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
              color: theme.eui.euiColorFullShade,
              formatter: InfraFormatterType.bits,
              formatterTemplate: '{{value}}/s',
            },
            tx: {
<<<<<<< HEAD
              name: 'Outbound (TX)',
=======
              name: i18n.translate(
                'xpack.infra.metricDetailPage.hostMetricsLayout.overviewSection.outboundTXSeriesLabel',
                {
                  defaultMessage: 'Outbound (TX)',
                }
              ),
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
              color: theme.eui.euiColorFullShade,
              formatter: InfraFormatterType.bits,
              formatterTemplate: '{{value}}/s',
            },
          },
        },
      },
      {
        id: InfraMetric.hostCpuUsage,
<<<<<<< HEAD
        label: 'CPU Usage',
=======
        label: i18n.translate(
          'xpack.infra.metricDetailPage.hostMetricsLayout.cpuUsageSection.sectionLabel',
          {
            defaultMessage: 'CPU Usage',
          }
        ),
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
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
<<<<<<< HEAD
        label: 'Load',
=======
        label: i18n.translate(
          'xpack.infra.metricDetailPage.hostMetricsLayout.loadSection.sectionLabel',
          {
            defaultMessage: 'Load',
          }
        ),
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
        requires: ['system.load'],
        type: InfraMetricLayoutSectionType.chart,
        visConfig: {
          seriesOverrides: {
<<<<<<< HEAD
            load_1m: { color: theme.eui.euiColorVis0, name: '1m' },
            load_5m: { color: theme.eui.euiColorVis1, name: '5m' },
            load_15m: { color: theme.eui.euiColorVis3, name: '15m' },
=======
            load_1m: {
              color: theme.eui.euiColorVis0,
              name: i18n.translate(
                'xpack.infra.metricDetailPage.hostMetricsLayout.loadSection.oneMinuteSeriesLabel',
                {
                  defaultMessage: '1m',
                }
              ),
            },
            load_5m: {
              color: theme.eui.euiColorVis1,
              name: i18n.translate(
                'xpack.infra.metricDetailPage.hostMetricsLayout.loadSection.fiveMinuteSeriesLabel',
                {
                  defaultMessage: '5m',
                }
              ),
            },
            load_15m: {
              color: theme.eui.euiColorVis3,
              name: i18n.translate(
                'xpack.infra.metricDetailPage.hostMetricsLayout.loadSection.fifteenMinuteSeriesLabel',
                {
                  defaultMessage: '15m',
                }
              ),
            },
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
          },
        },
      },
      {
        id: InfraMetric.hostMemoryUsage,
<<<<<<< HEAD
        label: 'MemoryUsage',
=======
        label: i18n.translate(
          'xpack.infra.metricDetailPage.hostMetricsLayout.memoryUsageSection.sectionLabel',
          {
            defaultMessage: 'Memory Usage',
          }
        ),
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
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
<<<<<<< HEAD
        label: 'Network Traffic',
=======
        label: i18n.translate(
          'xpack.infra.metricDetailPage.hostMetricsLayout.networkTrafficSection.sectionLabel',
          {
            defaultMessage: 'Network Traffic',
          }
        ),
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
        requires: ['system.network'],
        type: InfraMetricLayoutSectionType.chart,
        visConfig: {
          formatter: InfraFormatterType.bits,
          formatterTemplate: '{{value}}/s',
          type: InfraMetricLayoutVisualizationType.area,
          seriesOverrides: {
<<<<<<< HEAD
            rx: { color: theme.eui.euiColorVis1, name: 'in' },
            tx: { color: theme.eui.euiColorVis2, name: 'out' },
=======
            rx: {
              color: theme.eui.euiColorVis1,
              name: i18n.translate(
                'xpack.infra.metricDetailPage.hostMetricsLayout.networkTrafficSection.networkRxRateSeriesLabel',
                {
                  defaultMessage: 'in',
                }
              ),
            },
            tx: {
              color: theme.eui.euiColorVis2,
              name: i18n.translate(
                'xpack.infra.metricDetailPage.hostMetricsLayout.networkTrafficSection.networkTxRateSeriesLabel',
                {
                  defaultMessage: 'out',
                }
              ),
            },
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
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
<<<<<<< HEAD
        label: 'Overview',
=======
        label: i18n.translate(
          'xpack.infra.metricDetailPage.kubernetesMetricsLayout.overviewSection.sectionLabel',
          {
            defaultMessage: 'Overview',
          }
        ),
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
        requires: ['kubernetes.node'],
        type: InfraMetricLayoutSectionType.gauges,
        visConfig: {
          seriesOverrides: {
            cpucap: {
<<<<<<< HEAD
              name: 'CPU Capacity',
=======
              name: i18n.translate(
                'xpack.infra.metricDetailPage.kubernetesMetricsLayout.overviewSection.cpuUsageSeriesLabel',
                {
                  defaultMessage: 'CPU Capacity',
                }
              ),
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
              color: 'secondary',
              formatter: InfraFormatterType.percent,
              gaugeMax: 1,
            },
<<<<<<< HEAD
            load: { name: 'Load (5m)', color: 'secondary' },
            memorycap: {
              name: 'Memory Capacity',
=======
            load: {
              name: i18n.translate(
                'xpack.infra.metricDetailPage.kubernetesMetricsLayout.overviewSection.loadSeriesLabel',
                {
                  defaultMessage: 'Load (5m)',
                }
              ),
              color: 'secondary',
            },
            memorycap: {
              name: i18n.translate(
                'xpack.infra.metricDetailPage.kubernetesMetricsLayout.overviewSection.memoryUsageSeriesLabel',
                {
                  defaultMessage: 'Memory Capacity',
                }
              ),
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
              color: 'secondary',
              formatter: InfraFormatterType.percent,
              gaugeMax: 1,
            },
            podcap: {
<<<<<<< HEAD
              name: 'Pod Capacity',
=======
              name: i18n.translate(
                'xpack.infra.metricDetailPage.kubernetesMetricsLayout.overviewSection.podCapacitySeriesLabel',
                {
                  defaultMessage: 'Pod Capacity',
                }
              ),
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
              color: 'secondary',
              formatter: InfraFormatterType.percent,
              gaugeMax: 1,
            },
            diskcap: {
<<<<<<< HEAD
              name: 'Disk Capacity',
=======
              name: i18n.translate(
                'xpack.infra.metricDetailPage.kubernetesMetricsLayout.overviewSection.diskCapacitySeriesLabel',
                {
                  defaultMessage: 'Disk Capacity',
                }
              ),
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
              color: 'secondary',
              formatter: InfraFormatterType.percent,
              gaugeMax: 1,
            },
          },
        },
      },
      {
        id: InfraMetric.hostK8sCpuCap,
<<<<<<< HEAD
        label: 'Node CPU Capacity',
=======
        label: i18n.translate(
          'xpack.infra.metricDetailPage.kubernetesMetricsLayout.nodeCpuCapacitySection.sectionLabel',
          {
            defaultMessage: 'Node CPU Capacity',
          }
        ),
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
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
<<<<<<< HEAD
        label: 'Node Memory Capacity',
=======
        label: i18n.translate(
          'xpack.infra.metricDetailPage.kubernetesMetricsLayout.nodeMemoryCapacitySection.sectionLabel',
          {
            defaultMessage: 'Node Memory Capacity',
          }
        ),
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
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
<<<<<<< HEAD
        label: 'Node Disk Capacity',
=======
        label: i18n.translate(
          'xpack.infra.metricDetailPage.kubernetesMetricsLayout.nodeDiskCapacitySection.sectionLabel',
          {
            defaultMessage: 'Node Disk Capacity',
          }
        ),
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
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
<<<<<<< HEAD
        label: 'Node Pod Capacity',
=======
        label: i18n.translate(
          'xpack.infra.metricDetailPage.kubernetesMetricsLayout.nodePodCapacitySection.sectionLabel',
          {
            defaultMessage: 'Node Pod Capacity',
          }
        ),
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
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
