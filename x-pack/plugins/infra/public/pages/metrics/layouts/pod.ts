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

export const podLayoutCreator: InfraMetricLayoutCreator = theme => [
  {
    id: 'podOverview',
    label: i18n.translate('xpack.infra.metricsPage.podOverviewLabel', {
      defaultMessage: 'Pod Overview',
    }),
    sections: [
      {
        id: InfraMetric.podOverview,
        label: i18n.translate('xpack.infra.metricsPage.podOverviewSectionLabel', {
          defaultMessage: 'Pod Overview',
        }),
        requires: ['kubernetes.pod'],
        type: InfraMetricLayoutSectionType.gauges,
        visConfig: {
          seriesOverrides: {
            cpu: {
              name: i18n.translate('xpack.infra.metricsPage.visConfig.cpuUsageName', {
                defaultMessage: 'CPU Usage',
              }),
              color: theme.eui.euiColorFullShade,
              formatter: InfraFormatterType.percent,
              gaugeMax: 1,
            },
            memory: {
              name: i18n.translate('xpack.infra.metricsPage.visConfig.memoryUsageName', {
                defaultMessage: 'Memory Usage',
              }),
              color: theme.eui.euiColorFullShade,
              formatter: InfraFormatterType.percent,
              gaugeMax: 1,
            },
            rx: {
              name: i18n.translate('xpack.infra.metricsPage.visConfig.inboundRXName', {
                defaultMessage: 'Inbound (RX)',
              }),
              color: theme.eui.euiColorFullShade,
              formatter: InfraFormatterType.bits,
              formatterTemplate: '{{value}}/s',
            },
            tx: {
              name: i18n.translate('xpack.infra.metricsPage.visConfig.outboundTXName', {
                defaultMessage: 'Outbound (TX)',
              }),
              color: theme.eui.euiColorFullShade,
              formatter: InfraFormatterType.bits,
              formatterTemplate: '{{value}}/s',
            },
          },
        },
      },
      {
        id: InfraMetric.podCpuUsage,
        label: i18n.translate('xpack.infra.metricsPage.cpuUsageSectionLabel', {
          defaultMessage: 'CPU Usage',
        }),
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
        label: i18n.translate('xpack.infra.metricsPage.memoryUsageSectionLabel', {
          defaultMessage: 'Memory Usage',
        }),
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
        label: i18n.translate('xpack.infra.metricsPage.networkTrafficSectionLabel', {
          defaultMessage: 'Network Traffic',
        }),
        requires: ['kubernetes.pod'],
        type: InfraMetricLayoutSectionType.chart,
        visConfig: {
          formatter: InfraFormatterType.bits,
          formatterTemplate: '{{value}}/s',
          type: InfraMetricLayoutVisualizationType.area,
          seriesOverrides: {
            rx: {
              color: theme.eui.euiColorVis1,
              name: i18n.translate('xpack.infra.metricsPage.visConfig.inName', {
                defaultMessage: 'in',
              }),
            },
            tx: {
              color: theme.eui.euiColorVis2,
              name: i18n.translate('xpack.infra.metricsPage.visConfig.outName', {
                defaultMessage: 'out',
              }),
            },
          },
        },
      },
    ],
  },
  ...nginxLayoutCreator(theme),
];
