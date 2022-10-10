/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { withTheme } from '@kbn/kibana-react-plugin/common';
import React from 'react';
import type { LayoutPropsWithTheme } from '../../types';
import { ChartSectionVis } from '../chart_section_vis';
import { GaugesSectionVis } from '../gauges_section_vis';
import { LayoutContent } from '../layout_content';
import { MetadataDetails } from '../metadata_details';
import { Section } from '../section';
import { SubSection } from '../sub_section';
import { NginxLayoutSection } from './nginx_layout_sections';

export const PodLayout = withTheme(
  ({ metrics, onChangeRangeTime, theme }: LayoutPropsWithTheme) => (
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
          onChangeRangeTime={onChangeRangeTime}
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
        <NginxLayoutSection metrics={metrics} onChangeRangeTime={onChangeRangeTime} />
      </LayoutContent>
    </React.Fragment>
  )
);
