/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPanel } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { withEuiTheme } from '@elastic/eui';
import React from 'react';
import type { LayoutPropsWithTheme } from '../../types';
import { ChartSectionVis } from '../chart_section_vis';
import { Section } from '../section';
import { SubSection } from '../sub_section';

export const AwsRDSLayout = withEuiTheme(
  ({ metrics, onChangeRangeTime, theme }: LayoutPropsWithTheme) => (
    <EuiPanel>
      <Section
        navLabel="AWS RDS"
        sectionLabel={i18n.translate(
          'xpack.infra.metricDetailPage.rdsMetricsLayout.overviewSection.sectionLabel',
          {
            defaultMessage: 'Aws RDS Overview',
          }
        )}
        metrics={metrics}
        onChangeRangeTime={onChangeRangeTime}
      >
        <SubSection
          id="awsRDSCpuTotal"
          label={i18n.translate(
            'xpack.infra.metricDetailPage.rdsMetricsLayout.cpuTotal.sectionLabel',
            {
              defaultMessage: 'Total CPU Usage',
            }
          )}
        >
          <ChartSectionVis
            type="area"
            formatter="percent"
            seriesOverrides={{
              cpu: {
                color: theme.euiTheme.colors.vis.euiColorVis1,
                name: i18n.translate(
                  'xpack.infra.metricDetailPage.rdsMetricsLayout.cpuTotal.chartLabel',
                  { defaultMessage: 'Total' }
                ),
              },
            }}
          />
        </SubSection>
        <SubSection
          id="awsRDSConnections"
          label={i18n.translate(
            'xpack.infra.metricDetailPage.rdsMetricsLayout.connections.sectionLabel',
            {
              defaultMessage: 'Connections',
            }
          )}
        >
          <ChartSectionVis
            type="bar"
            formatter="number"
            seriesOverrides={{
              connections: {
                color: theme.euiTheme.colors.vis.euiColorVis1,
                name: i18n.translate(
                  'xpack.infra.metricDetailPage.rdsMetricsLayout.connections.chartLabel',
                  { defaultMessage: 'Connections' }
                ),
              },
            }}
          />
        </SubSection>
        <SubSection
          id="awsRDSQueriesExecuted"
          label={i18n.translate(
            'xpack.infra.metricDetailPage.rdsMetricsLayout.queriesExecuted.sectionLabel',
            {
              defaultMessage: 'Queries Executed',
            }
          )}
        >
          <ChartSectionVis
            type="bar"
            formatter="number"
            seriesOverrides={{
              queries: {
                color: theme.euiTheme.colors.vis.euiColorVis1,
                name: i18n.translate(
                  'xpack.infra.metricDetailPage.rdsMetricsLayout.queriesExecuted.chartLabel',
                  { defaultMessage: 'Queries' }
                ),
              },
            }}
          />
        </SubSection>
        <SubSection
          id="awsRDSActiveTransactions"
          label={i18n.translate(
            'xpack.infra.metricDetailPage.rdsMetricsLayout.activeTransactions.sectionLabel',
            {
              defaultMessage: 'Transactions',
            }
          )}
        >
          <ChartSectionVis
            type="bar"
            formatter="number"
            seriesOverrides={{
              active: {
                color: theme.euiTheme.colors.vis.euiColorVis1,
                name: i18n.translate(
                  'xpack.infra.metricDetailPage.rdsMetricsLayout.active.chartLabel',
                  { defaultMessage: 'Active' }
                ),
              },
              blocked: {
                color: theme.euiTheme.colors.vis.euiColorVis2,
                name: i18n.translate(
                  'xpack.infra.metricDetailPage.rdsMetricsLayout.blocked.chartLabel',
                  { defaultMessage: 'Blocked' }
                ),
              },
            }}
          />
        </SubSection>
        <SubSection
          id="awsRDSLatency"
          label={i18n.translate(
            'xpack.infra.metricDetailPage.rdsMetricsLayout.latency.sectionLabel',
            {
              defaultMessage: 'Latency',
            }
          )}
        >
          <ChartSectionVis
            type="bar"
            stacked={true}
            formatter="highPrecision"
            formatterTemplate={'{{value}} ms'}
            seriesOverrides={{
              read: {
                color: theme.euiTheme.colors.vis.euiColorVis1,
                name: i18n.translate(
                  'xpack.infra.metricDetailPage.rdsMetricsLayout.latency.read.chartLabel',
                  { defaultMessage: 'Read' }
                ),
              },
              write: {
                color: theme.euiTheme.colors.vis.euiColorVis2,
                name: i18n.translate(
                  'xpack.infra.metricDetailPage.rdsMetricsLayout.latency.write.chartLabel',
                  { defaultMessage: 'Write' }
                ),
              },
              insert: {
                color: theme.euiTheme.colors.vis.euiColorVis0,
                name: i18n.translate(
                  'xpack.infra.metricDetailPage.rdsMetricsLayout.latency.insert.chartLabel',
                  { defaultMessage: 'Insert' }
                ),
              },
              update: {
                color: theme.euiTheme.colors.vis.euiColorVis7,
                name: i18n.translate(
                  'xpack.infra.metricDetailPage.rdsMetricsLayout.latency.update.chartLabel',
                  { defaultMessage: 'Update' }
                ),
              },
              commit: {
                color: theme.euiTheme.colors.vis.euiColorVis3,
                name: i18n.translate(
                  'xpack.infra.metricDetailPage.rdsMetricsLayout.latency.commit.chartLabel',
                  { defaultMessage: 'Commit' }
                ),
              },
            }}
          />
        </SubSection>
      </Section>
    </EuiPanel>
  )
);
