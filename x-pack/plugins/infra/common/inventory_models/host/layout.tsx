/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { withTheme } from '../../../../observability/public';
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
import * as Aws from '../shared/layouts/aws';
import * as Ngnix from '../shared/layouts/nginx';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { MetadataDetails } from '../../../public/pages/metrics/components/metadata_details';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { LayoutContent } from '../../../public/pages/metrics/components/layout_content';

export const Layout = withTheme(({ metrics, theme }: LayoutPropsWithTheme) => (
  <React.Fragment>
    <MetadataDetails
      fields={[
        'host.hostname',
        'host.os.name',
        'host.os.kernel',
        'host.containerized',
        'cloud.provider',
        'cloud.availability_zone',
        'cloud.machine.type',
        'cloud.project.id',
        'cloud.instance.id',
        'cloud.instance.name',
      ]}
    />
    <LayoutContent>
      <Section
        navLabel={i18n.translate('xpack.infra.metricDetailPage.hostMetricsLayout.layoutLabel', {
          defaultMessage: 'Host',
        })}
        sectionLabel={i18n.translate(
          'xpack.infra.metricDetailPage.hostMetricsLayout.overviewSection.sectionLabel',
          {
            defaultMessage: 'Host Overview',
          }
        )}
        metrics={metrics}
      >
        <SubSection id="hostSystemOverview">
          <GaugesSectionVis
            seriesOverrides={{
              cpu: {
                name: i18n.translate(
                  'xpack.infra.metricDetailPage.hostMetricsLayout.overviewSection.cpuUsageSeriesLabel',
                  {
                    defaultMessage: 'CPU Usage',
                  }
                ),
                color: theme.eui.euiColorFullShade,
                formatter: 'percent',
                gaugeMax: 1,
              },
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
                color: theme.eui.euiColorFullShade,
                formatter: 'percent',
                gaugeMax: 1,
              },
              rx: {
                name: i18n.translate(
                  'xpack.infra.metricDetailPage.hostMetricsLayout.overviewSection.inboundRXSeriesLabel',
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
                  'xpack.infra.metricDetailPage.hostMetricsLayout.overviewSection.outboundTXSeriesLabel',
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
          id="hostCpuUsage"
          label={i18n.translate(
            'xpack.infra.metricDetailPage.hostMetricsLayout.cpuUsageSection.sectionLabel',
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
              user: { color: theme.eui.euiColorVis0 },
              system: { color: theme.eui.euiColorVis2 },
              steal: { color: theme.eui.euiColorVis9 },
              irq: { color: theme.eui.euiColorVis4 },
              softirq: { color: theme.eui.euiColorVis6 },
              iowait: { color: theme.eui.euiColorVis7 },
              nice: { color: theme.eui.euiColorVis5 },
            }}
          />
        </SubSection>
        <SubSection
          id="hostLoad"
          label={i18n.translate(
            'xpack.infra.metricDetailPage.hostMetricsLayout.loadSection.sectionLabel',
            {
              defaultMessage: 'Load',
            }
          )}
        >
          <ChartSectionVis
            seriesOverrides={{
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
            }}
          />
        </SubSection>
        <SubSection
          id="hostMemoryUsage"
          label={i18n.translate(
            'xpack.infra.metricDetailPage.hostMetricsLayout.memoryUsageSection.sectionLabel',
            {
              defaultMessage: 'Memory Usage',
            }
          )}
        >
          <ChartSectionVis
            stacked={true}
            formatter="bytes"
            type="area"
            seriesOverrides={{
              used: { color: theme.eui.euiColorVis2 },
              free: { color: theme.eui.euiColorVis0 },
              cache: { color: theme.eui.euiColorVis1 },
            }}
          />
        </SubSection>
        <SubSection
          id="hostNetworkTraffic"
          label={i18n.translate(
            'xpack.infra.metricDetailPage.hostMetricsLayout.networkTrafficSection.sectionLabel',
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
            }}
          />
        </SubSection>
      </Section>
      <Section
        navLabel="Kubernetes"
        sectionLabel={i18n.translate(
          'xpack.infra.metricDetailPage.kubernetesMetricsLayout.overviewSection.sectionLabel',
          {
            defaultMessage: 'Kubernetes Overview',
          }
        )}
        metrics={metrics}
      >
        <SubSection id="hostK8sOverview">
          <GaugesSectionVis
            seriesOverrides={{
              cpucap: {
                name: i18n.translate(
                  'xpack.infra.metricDetailPage.kubernetesMetricsLayout.overviewSection.cpuUsageSeriesLabel',
                  {
                    defaultMessage: 'CPU Capacity',
                  }
                ),
                color: 'secondary',
                formatter: 'percent',
                gaugeMax: 1,
              },
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
                color: 'secondary',
                formatter: 'percent',
                gaugeMax: 1,
              },
              podcap: {
                name: i18n.translate(
                  'xpack.infra.metricDetailPage.kubernetesMetricsLayout.overviewSection.podCapacitySeriesLabel',
                  {
                    defaultMessage: 'Pod Capacity',
                  }
                ),
                color: 'secondary',
                formatter: 'percent',
                gaugeMax: 1,
              },
              diskcap: {
                name: i18n.translate(
                  'xpack.infra.metricDetailPage.kubernetesMetricsLayout.overviewSection.diskCapacitySeriesLabel',
                  {
                    defaultMessage: 'Disk Capacity',
                  }
                ),
                color: 'secondary',
                formatter: 'percent',
                gaugeMax: 1,
              },
            }}
          />
        </SubSection>
        <SubSection
          id="hostK8sCpuCap"
          label={i18n.translate(
            'xpack.infra.metricDetailPage.kubernetesMetricsLayout.nodeCpuCapacitySection.sectionLabel',
            {
              defaultMessage: 'Node CPU Capacity',
            }
          )}
        >
          <ChartSectionVis
            formatter="abbreviatedNumber"
            seriesOverrides={{
              capacity: { color: theme.eui.euiColorVis2 },
              used: { color: theme.eui.euiColorVis1, type: 'area' },
            }}
          />
        </SubSection>
        <SubSection
          id="hostK8sMemoryCap"
          label={i18n.translate(
            'xpack.infra.metricDetailPage.kubernetesMetricsLayout.nodeMemoryCapacitySection.sectionLabel',
            {
              defaultMessage: 'Node Memory Capacity',
            }
          )}
        >
          <ChartSectionVis
            formatter="bytes"
            seriesOverrides={{
              capacity: { color: theme.eui.euiColorVis2 },
              used: { color: theme.eui.euiColorVis1, type: 'area' },
            }}
          />
        </SubSection>
        <SubSection
          id="hostK8sDiskCap"
          label={i18n.translate(
            'xpack.infra.metricDetailPage.kubernetesMetricsLayout.nodeDiskCapacitySection.sectionLabel',
            {
              defaultMessage: 'Node Disk Capacity',
            }
          )}
        >
          <ChartSectionVis
            formatter="bytes"
            seriesOverrides={{
              capacity: { color: theme.eui.euiColorVis2 },
              used: { color: theme.eui.euiColorVis1, type: 'area' },
            }}
          />
        </SubSection>
        <SubSection
          id="hostK8sPodCap"
          label={i18n.translate(
            'xpack.infra.metricDetailPage.kubernetesMetricsLayout.nodePodCapacitySection.sectionLabel',
            {
              defaultMessage: 'Node Pod Capacity',
            }
          )}
        >
          <ChartSectionVis
            formatter="number"
            seriesOverrides={{
              capacity: { color: theme.eui.euiColorVis2 },
              used: { color: theme.eui.euiColorVis1, type: 'area' },
            }}
          />
        </SubSection>
      </Section>
      <Aws.Layout metrics={metrics} />
      <Ngnix.Layout metrics={metrics} />
    </LayoutContent>
  </React.Fragment>
));
