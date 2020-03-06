/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { LayoutPropsWithTheme } from '../../../public/pages/metrics/types';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { Section } from '../../../public/pages/metrics/components/section';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { SubSection } from '../../../public/pages/metrics/components/sub_section';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { GaugesSectionVis } from '../../../public/pages/metrics/components/gauges_section_vis';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ChartSectionVis } from '../../../public/pages/metrics/components/chart_section_vis';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { withTheme } from '../../../../observability/public';
import * as Nginx from '../shared/layouts/nginx';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { MetadataDetails } from '../../../public/pages/metrics/components/metadata_details';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { LayoutContent } from '../../../public/pages/metrics/components/layout_content';

export const Layout = withTheme(({ metrics, theme }: LayoutPropsWithTheme) => (
  <React.Fragment>
    <MetadataDetails />
    <LayoutContent>
      <Section
        navLabel={i18n.translate('xpack.infra.metricDetailPage.podMetricsLayout.layoutLabel', {
          defaultMessage: 'Pod',
        })}
        sectionLabel={i18n.translate(
          'xpack.infra.metricDetailPage.podMetricsLayout.overviewSection.sectionLabel',
          {
            defaultMessage: 'Pod Overview',
          }
        )}
        metrics={metrics}
      >
        <SubSection id="podOverview">
          <GaugesSectionVis
            seriesOverrides={{
              cpu: {
                name: i18n.translate(
                  'xpack.infra.metricDetailPage.podMetricsLayout.overviewSection.cpuUsageSeriesLabel',
                  {
                    defaultMessage: 'CPU Usage',
                  }
                ),
                color: theme.eui.euiColorFullShade,
                formatter: 'percent',
                gaugeMax: 1,
              },
              memory: {
                name: i18n.translate(
                  'xpack.infra.metricDetailPage.podMetricsLayout.overviewSection.memoryUsageSeriesLabel',
                  {
                    defaultMessage: 'Memory Usage',
                  }
                ),
                color: theme.eui.euiColorFullShade,
                formatter: 'percent',
                gaugeMax: 1,
              },
              rx: {
                name: i18n.translate(
                  'xpack.infra.metricDetailPage.podMetricsLayout.overviewSection.inboundRXSeriesLabel',
                  {
                    defaultMessage: 'Inbound (RX)',
                  }
                ),
                color: theme.eui.euiColorFullShade,
                formatter: 'bits',
                formatterTemplate: '{{value}}/s',
              },
              tx: {
                name: i18n.translate(
                  'xpack.infra.metricDetailPage.podMetricsLayout.overviewSection.outboundTXSeriesLabel',
                  {
                    defaultMessage: 'Outbound (TX)',
                  }
                ),
                color: theme.eui.euiColorFullShade,
                formatter: 'bits',
                formatterTemplate: '{{value}}/s',
              },
            }}
          />
        </SubSection>
        <SubSection
          id="podCpuUsage"
          label={i18n.translate(
            'xpack.infra.metricDetailPage.podMetricsLayout.cpuUsageSection.sectionLabel',
            {
              defaultMessage: 'CPU Usage',
            }
          )}
        >
          <ChartSectionVis
            formatter="percent"
            type="area"
            seriesOverrides={{
              cpu: { color: theme.eui.euiColorVis1 },
            }}
          />
        </SubSection>
        <SubSection
          id="podMemoryUsage"
          label={i18n.translate(
            'xpack.infra.metricDetailPage.podMetricsLayout.memoryUsageSection.sectionLabel',
            {
              defaultMessage: 'Memory Usage',
            }
          )}
        >
          <ChartSectionVis
            type="area"
            formatter="percent"
            seriesOverrides={{
              memory: {
                color: theme.eui.euiColorVis1,
              },
            }}
          />
        </SubSection>
        <SubSection
          id="podNetworkTraffic"
          label={i18n.translate(
            'xpack.infra.metricDetailPage.podMetricsLayout.networkTrafficSection.sectionLabel',
            {
              defaultMessage: 'Network Traffic',
            }
          )}
        >
          <ChartSectionVis
            formatter="bits"
            formatterTemplate="{{value}}/s"
            type="area"
            seriesOverrides={{
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
            }}
          />
        </SubSection>
      </Section>
      <Nginx.Layout metrics={metrics} />
    </LayoutContent>
  </React.Fragment>
));
