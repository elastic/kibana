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

export const podLayoutCreator: InfraMetricLayoutCreator = theme => [
  {
    id: 'podOverview',
<<<<<<< HEAD
    label: 'Pod Overview',
    sections: [
      {
        id: InfraMetric.podOverview,
        label: 'Pod Overview',
=======
    label: i18n.translate('xpack.infra.metricDetailPage.podMetricsLayout.layoutLabel', {
      defaultMessage: 'Pod',
    }),
    sections: [
      {
        id: InfraMetric.podOverview,
        label: i18n.translate(
          'xpack.infra.metricDetailPage.podMetricsLayout.overviewSection.sectionLabel',
          {
            defaultMessage: 'Overview',
          }
        ),
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
        requires: ['kubernetes.pod'],
        type: InfraMetricLayoutSectionType.gauges,
        visConfig: {
          seriesOverrides: {
            cpu: {
<<<<<<< HEAD
              name: 'CPU Usage',
=======
              name: i18n.translate(
                'xpack.infra.metricDetailPage.podMetricsLayout.overviewSection.cpuUsageSeriesLabel',
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
                'xpack.infra.metricDetailPage.podMetricsLayout.overviewSection.memoryUsageSeriesLabel',
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
                'xpack.infra.metricDetailPage.podMetricsLayout.overviewSection.inboundRXSeriesLabel',
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
                'xpack.infra.metricDetailPage.podMetricsLayout.overviewSection.outboundTXSeriesLabel',
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
        id: InfraMetric.podCpuUsage,
<<<<<<< HEAD
        label: 'CPU Usage',
=======
        label: i18n.translate(
          'xpack.infra.metricDetailPage.podMetricsLayout.cpuUsageSection.sectionLabel',
          {
            defaultMessage: 'CPU Usage',
          }
        ),
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
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
<<<<<<< HEAD
        label: 'Memory Usage',
=======
        label: i18n.translate(
          'xpack.infra.metricDetailPage.podMetricsLayout.memoryUsageSection.sectionLabel',
          {
            defaultMessage: 'Memory Usage',
          }
        ),
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
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
<<<<<<< HEAD
        label: 'Network Traffic',
=======
        label: i18n.translate(
          'xpack.infra.metricDetailPage.podMetricsLayout.networkTrafficSection.sectionLabel',
          {
            defaultMessage: 'Network Traffic',
          }
        ),
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
        requires: ['kubernetes.pod'],
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
                'xpack.infra.metricDetailPage.podMetricsLayout.networkTrafficSection.networkRxRateSeriesLabel',
                {
                  defaultMessage: 'in',
                }
              ),
            },
            tx: {
              color: theme.eui.euiColorVis2,
              name: i18n.translate(
                'xpack.infra.metricDetailPage.podMetricsLayout.networkTrafficSection.networkTxRateSeriesLabel',
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
  ...nginxLayoutCreator(theme),
];
