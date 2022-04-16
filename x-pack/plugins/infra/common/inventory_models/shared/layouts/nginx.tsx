/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { withTheme } from '@kbn/kibana-react-plugin/common';
import { LayoutPropsWithTheme } from '../../../../public/pages/metrics/metric_detail/types';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { Section } from '../../../../public/pages/metrics/metric_detail/components/section';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { SubSection } from '../../../../public/pages/metrics/metric_detail/components/sub_section';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ChartSectionVis } from '../../../../public/pages/metrics/metric_detail/components/chart_section_vis';

export const Layout = withTheme(({ metrics, onChangeRangeTime, theme }: LayoutPropsWithTheme) => (
  <React.Fragment>
    <Section
      navLabel="Nginx"
      sectionLabel="Nginx"
      metrics={metrics}
      onChangeRangeTime={onChangeRangeTime}
    >
      <SubSection
        id="nginxHits"
        label={i18n.translate(
          'xpack.infra.metricDetailPage.nginxMetricsLayout.hitsSection.sectionLabel',
          {
            defaultMessage: 'Hits',
          }
        )}
      >
        <ChartSectionVis
          stacked={true}
          type="bar"
          formatter="abbreviatedNumber"
          seriesOverrides={{
            '200s': { color: theme.eui.euiColorVis1 },
            '300s': { color: theme.eui.euiColorVis5 },
            '400s': { color: theme.eui.euiColorVis2 },
            '500s': { color: theme.eui.euiColorVis9 },
          }}
        />
      </SubSection>
      <SubSection
        id="nginxRequestRate"
        label={i18n.translate(
          'xpack.infra.metricDetailPage.nginxMetricsLayout.requestRateSection.sectionLabel',
          {
            defaultMessage: 'Request Rate',
          }
        )}
      >
        <ChartSectionVis
          type="area"
          formatter="abbreviatedNumber"
          formatterTemplate="{{value}}/s"
          seriesOverrides={{
            rate: { color: theme.eui.euiColorVis1 },
          }}
        />
      </SubSection>
      <SubSection
        id="nginxActiveConnections"
        label={i18n.translate(
          'xpack.infra.metricDetailPage.nginxMetricsLayout.activeConnectionsSection.sectionLabel',
          {
            defaultMessage: 'Active Connections',
          }
        )}
      >
        <ChartSectionVis
          type="area"
          formatter="abbreviatedNumber"
          seriesOverrides={{
            connections: {
              color: theme.eui.euiColorVis1,
              type: 'bar',
            },
          }}
        />
      </SubSection>
      <SubSection
        id="nginxRequestsPerConnection"
        label={i18n.translate(
          'xpack.infra.metricDetailPage.nginxMetricsLayout.requestsPerConnectionsSection.sectionLabel',
          {
            defaultMessage: 'Requests per Connections',
          }
        )}
      >
        <ChartSectionVis
          type="bar"
          formatter="abbreviatedNumber"
          seriesOverrides={{
            reqPerConns: {
              color: theme.eui.euiColorVis1,
              name: i18n.translate(
                'xpack.infra.metricDetailPage.nginxMetricsLayout.requestsPerConnectionsSection.reqsPerConnSeriesLabel',
                {
                  defaultMessage: 'reqs per conn',
                }
              ),
            },
          }}
        />
      </SubSection>
    </Section>
  </React.Fragment>
));
