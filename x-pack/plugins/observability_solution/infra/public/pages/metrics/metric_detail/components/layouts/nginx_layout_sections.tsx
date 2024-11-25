/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { useEuiTheme } from '@elastic/eui';
import type { LayoutPropsWithChildren } from '../../types';
import { Section } from '../section';
import { SubSection } from '../sub_section';
import { ChartSectionVis } from '../chart_section_vis';

export function NginxLayoutSection({ metrics, onChangeRangeTime }: LayoutPropsWithChildren) {
  const { euiTheme } = useEuiTheme();
  return (
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
              '200s': { color: euiTheme.colors.vis.euiColorVis1 },
              '300s': { color: euiTheme.colors.vis.euiColorVis5 },
              '400s': { color: euiTheme.colors.vis.euiColorVis2 },
              '500s': { color: euiTheme.colors.vis.euiColorVis9 },
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
              rate: { color: euiTheme.colors.vis.euiColorVis1 },
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
                color: euiTheme.colors.vis.euiColorVis1,
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
                color: euiTheme.colors.vis.euiColorVis1,
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
  );
}
