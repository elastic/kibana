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

export const containerLayoutCreator: InfraMetricLayoutCreator = theme => [
  {
    id: 'containerOverview',
<<<<<<< HEAD
    label: 'Container',
    sections: [
      {
        id: InfraMetric.containerOverview,
        label: 'Overview',
=======
    label: i18n.translate('xpack.infra.metricDetailPage.containerMetricsLayout.layoutLabel', {
      defaultMessage: 'Container',
    }),
    sections: [
      {
        id: InfraMetric.containerOverview,
        label: i18n.translate(
          'xpack.infra.metricDetailPage.containerMetricsLayout.overviewSection.sectionLabel',
          {
            defaultMessage: 'Overview',
          }
        ),
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
        requires: ['docker.cpu', 'docker.memory', 'docker.network'],
        type: InfraMetricLayoutSectionType.gauges,
        visConfig: {
          seriesOverrides: {
            cpu: {
<<<<<<< HEAD
              name: 'CPU Usage',
=======
              name: i18n.translate(
                'xpack.infra.metricDetailPage.containerMetricsLayout.overviewSection.cpuUsageSeriesLabel',
                {
                  defaultMessage: 'CPU Usage',
                }
              ),
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
              color: theme.eui.euiColorFullShade,
              formatter: InfraFormatterType.percent,
              gaugeMax: 1,
            },
            memory: {
<<<<<<< HEAD
              name: 'Memory Usage',
=======
              name: i18n.translate(
                'xpack.infra.metricDetailPage.containerMetricsLayout.overviewSection.memoryUsageSeriesLabel',
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
                'xpack.infra.metricDetailPage.containerMetricsLayout.overviewSection.inboundRXSeriesLabel',
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
                'xpack.infra.metricDetailPage.containerMetricsLayout.overviewSection.outboundTXSeriesLabel',
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
        id: InfraMetric.containerCpuUsage,
<<<<<<< HEAD
        label: 'CPU Usage',
=======
        label: i18n.translate(
          'xpack.infra.metricDetailPage.containerMetricsLayout.cpuUsageSection.sectionLabel',
          {
            defaultMessage: 'CPU Usage',
          }
        ),
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
        requires: ['docker.cpu'],
        type: InfraMetricLayoutSectionType.chart,
        visConfig: {
          stacked: true,
          type: InfraMetricLayoutVisualizationType.area,
          formatter: InfraFormatterType.percent,
          seriesOverrides: {
            cpu: { color: theme.eui.euiColorVis1 },
          },
        },
      },
      {
        id: InfraMetric.containerMemory,
<<<<<<< HEAD
        label: 'Memory Usage',
=======
        label: i18n.translate(
          'xpack.infra.metricDetailPage.containerMetricsLayout.memoryUsageSection.sectionLabel',
          {
            defaultMessage: 'Memory Usage',
          }
        ),
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
        requires: ['docker.memory'],
        type: InfraMetricLayoutSectionType.chart,
        visConfig: {
          stacked: true,
          type: InfraMetricLayoutVisualizationType.area,
          formatter: InfraFormatterType.percent,
          seriesOverrides: {
            memory: { color: theme.eui.euiColorVis1 },
          },
        },
      },
      {
        id: InfraMetric.containerNetworkTraffic,
<<<<<<< HEAD
        label: 'Network Traffic',
=======
        label: i18n.translate(
          'xpack.infra.metricDetailPage.containerMetricsLayout.networkTrafficSection.sectionLabel',
          {
            defaultMessage: 'Network Traffic',
          }
        ),
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
        requires: ['docker.network'],
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
                'xpack.infra.metricDetailPage.containerMetricsLayout.networkTrafficSection.networkRxRateSeriesLabel',
                {
                  defaultMessage: 'in',
                }
              ),
            },
            tx: {
              color: theme.eui.euiColorVis2,
              name: i18n.translate(
                'xpack.infra.metricDetailPage.containerMetricsLayout.networkTrafficSection.networkTxRateSeriesLabel',
                {
                  defaultMessage: 'out',
                }
              ),
            },
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
          },
        },
      },
      {
        id: InfraMetric.containerDiskIOOps,
<<<<<<< HEAD
        label: 'Disk IO (Ops)',
=======
        label: i18n.translate(
          'xpack.infra.metricDetailPage.containerMetricsLayout.diskIoOpsSection.sectionLabel',
          {
            defaultMessage: 'Disk IO (Ops)',
          }
        ),
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
        requires: ['docker.diskio'],
        type: InfraMetricLayoutSectionType.chart,
        visConfig: {
          formatter: InfraFormatterType.number,
          formatterTemplate: '{{value}}/s',
          type: InfraMetricLayoutVisualizationType.area,
          seriesOverrides: {
<<<<<<< HEAD
            read: { color: theme.eui.euiColorVis1, name: 'reads' },
            write: { color: theme.eui.euiColorVis2, name: 'writes' },
=======
            read: {
              color: theme.eui.euiColorVis1,
              name: i18n.translate(
                'xpack.infra.metricDetailPage.containerMetricsLayout.diskIoOpsSection.readRateSeriesLabel',
                {
                  defaultMessage: 'reads',
                }
              ),
            },
            write: {
              color: theme.eui.euiColorVis2,
              name: i18n.translate(
                'xpack.infra.metricDetailPage.containerMetricsLayout.diskIoOpsSection.writeRateSeriesLabel',
                {
                  defaultMessage: 'writes',
                }
              ),
            },
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
          },
        },
      },
      {
        id: InfraMetric.containerDiskIOBytes,
<<<<<<< HEAD
        label: 'Disk IO (Bytes)',
=======
        label: i18n.translate(
          'xpack.infra.metricDetailPage.containerMetricsLayout.diskIoBytesSection.sectionLabel',
          {
            defaultMessage: 'Disk IO (Bytes)',
          }
        ),
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
        requires: ['docker.diskio'],
        type: InfraMetricLayoutSectionType.chart,
        visConfig: {
          formatter: InfraFormatterType.bytes,
          formatterTemplate: '{{value}}/s',
          type: InfraMetricLayoutVisualizationType.area,
          seriesOverrides: {
<<<<<<< HEAD
            read: { color: theme.eui.euiColorVis1, name: 'reads' },
            write: { color: theme.eui.euiColorVis2, name: 'writes' },
=======
            read: {
              color: theme.eui.euiColorVis1,
              name: i18n.translate(
                'xpack.infra.metricDetailPage.containerMetricsLayout.diskIoBytesSection.readRateSeriesLabel',
                {
                  defaultMessage: 'reads',
                }
              ),
            },
            write: {
              color: theme.eui.euiColorVis2,
              name: i18n.translate(
                'xpack.infra.metricDetailPage.containerMetricsLayout.diskIoBytesSection.writeRateSeriesLabel',
                {
                  defaultMessage: 'writes',
                }
              ),
            },
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
          },
        },
      },
    ],
  },
  ...nginxLayoutCreator(theme),
];
