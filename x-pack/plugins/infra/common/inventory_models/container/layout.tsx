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
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { LayoutContent } from '../../../public/pages/metrics/components/layout_content';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { MetadataDetails } from '../../../public/pages/metrics/components/metadata_details';

export const Layout = withTheme(({ metrics, theme }: LayoutPropsWithTheme) => (
  <React.Fragment>
    <MetadataDetails />
    <LayoutContent>
      <Section
        navLabel={i18n.translate(
          'xpack.infra.metricDetailPage.containerMetricsLayout.layoutLabel',
          {
            defaultMessage: 'Container',
          }
        )}
        sectionLabel={i18n.translate(
          'xpack.infra.metricDetailPage.containerMetricsLayout.overviewSection.sectionLabel',
          {
            defaultMessage: 'Container Overview',
          }
        )}
        metrics={metrics}
      >
        <SubSection id="containerOverview">
          <GaugesSectionVis
            seriesOverrides={{
              cpu: {
                name: i18n.translate(
                  'xpack.infra.metricDetailPage.containerMetricsLayout.overviewSection.cpuUsageSeriesLabel',
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
                  'xpack.infra.metricDetailPage.containerMetricsLayout.overviewSection.memoryUsageSeriesLabel',
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
                  'xpack.infra.metricDetailPage.containerMetricsLayout.overviewSection.inboundRXSeriesLabel',
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
                  'xpack.infra.metricDetailPage.containerMetricsLayout.overviewSection.outboundTXSeriesLabel',
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
          id="containerCpuUsage"
          label={i18n.translate(
            'xpack.infra.metricDetailPage.containerMetricsLayout.cpuUsageSection.sectionLabel',
            {
              defaultMessage: 'CPU Usage',
            }
          )}
        >
          <ChartSectionVis
            stacked={true}
            type="area"
            formatter="percent"
            seriesOverrides={{
              cpu: { color: theme.eui.euiColorVis1 },
            }}
          />
        </SubSection>
        <SubSection
          id="containerMemory"
          label={i18n.translate(
            'xpack.infra.metricDetailPage.containerMetricsLayout.memoryUsageSection.sectionLabel',
            {
              defaultMessage: 'Memory Usage',
            }
          )}
        >
          <ChartSectionVis
            stacked={true}
            type="area"
            formatter="percent"
            seriesOverrides={{
              memory: { color: theme.eui.euiColorVis1 },
            }}
          />
        </SubSection>
        <SubSection
          id="containerNetworkTraffic"
          label={i18n.translate(
            'xpack.infra.metricDetailPage.containerMetricsLayout.networkTrafficSection.sectionLabel',
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
            }}
          />
        </SubSection>
        <SubSection
          id="containerDiskIOOps"
          label={i18n.translate(
            'xpack.infra.metricDetailPage.containerMetricsLayout.diskIoOpsSection.sectionLabel',
            {
              defaultMessage: 'Disk IO (Ops)',
            }
          )}
        >
          <ChartSectionVis
            type="area"
            formatterTemplate="{{value}}/s"
            formatter="number"
            seriesOverrides={{
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
            }}
          />
        </SubSection>
        <SubSection
          id="containerDiskIOBytes"
          label={i18n.translate(
            'xpack.infra.metricDetailPage.containerMetricsLayout.diskIoBytesSection.sectionLabel',
            {
              defaultMessage: 'Disk IO (Bytes)',
            }
          )}
        >
          <ChartSectionVis
            type="area"
            formatter="bytes"
            formatterTemplate="{{value}}/s"
            seriesOverrides={{
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
            }}
          />
        </SubSection>
      </Section>
    </LayoutContent>
  </React.Fragment>
));
