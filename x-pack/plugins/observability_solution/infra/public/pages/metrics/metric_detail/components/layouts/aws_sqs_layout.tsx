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

export const AwsSQSLayout = withEuiTheme(
  ({ metrics, onChangeRangeTime, theme }: LayoutPropsWithTheme) => (
    <EuiPanel>
      <Section
        navLabel="AWS SQS"
        sectionLabel={i18n.translate(
          'xpack.infra.metricDetailPage.sqsMetricsLayout.overviewSection.sectionLabel',
          {
            defaultMessage: 'Aws SQS Overview',
          }
        )}
        metrics={metrics}
        onChangeRangeTime={onChangeRangeTime}
      >
        <SubSection
          id="awsSQSMessagesVisible"
          label={i18n.translate(
            'xpack.infra.metricDetailPage.sqsMetricsLayout.messagesVisible.sectionLabel',
            {
              defaultMessage: 'Messages Available',
            }
          )}
        >
          <ChartSectionVis
            type="bar"
            formatter="abbreviatedNumber"
            seriesOverrides={{
              visible: {
                color: theme.euiTheme.colors.vis.euiColorVis1,
                name: i18n.translate(
                  'xpack.infra.metricDetailPage.sqsMetricsLayout.messagesVisible.chartLabel',
                  { defaultMessage: 'Available' }
                ),
              },
            }}
          />
        </SubSection>
        <SubSection
          id="awsSQSMessagesDelayed"
          label={i18n.translate(
            'xpack.infra.metricDetailPage.sqsMetricsLayout.messagesDelayed.sectionLabel',
            {
              defaultMessage: 'Messages Delayed',
            }
          )}
        >
          <ChartSectionVis
            type="bar"
            formatter="abbreviatedNumber"
            seriesOverrides={{
              delayed: {
                color: theme.euiTheme.colors.vis.euiColorVis1,
                name: i18n.translate(
                  'xpack.infra.metricDetailPage.sqsMetricsLayout.messagesDelayed.chartLabel',
                  { defaultMessage: 'Delayed' }
                ),
              },
            }}
          />
        </SubSection>
        <SubSection
          id="awsSQSMessagesSent"
          label={i18n.translate(
            'xpack.infra.metricDetailPage.sqsMetricsLayout.messagesSent.sectionLabel',
            {
              defaultMessage: 'Messages Added',
            }
          )}
        >
          <ChartSectionVis
            type="bar"
            formatter="abbreviatedNumber"
            seriesOverrides={{
              sent: {
                color: theme.euiTheme.colors.vis.euiColorVis1,
                name: i18n.translate(
                  'xpack.infra.metricDetailPage.sqsMetricsLayout.messagesSent.chartLabel',
                  { defaultMessage: 'Added' }
                ),
              },
            }}
          />
        </SubSection>
        <SubSection
          id="awsSQSMessagesEmpty"
          label={i18n.translate(
            'xpack.infra.metricDetailPage.sqsMetricsLayout.messagesEmpty.sectionLabel',
            {
              defaultMessage: 'Messages Empty',
            }
          )}
        >
          <ChartSectionVis
            type="bar"
            formatter="abbreviatedNumber"
            seriesOverrides={{
              sent: {
                color: theme.euiTheme.colors.vis.euiColorVis1,
                name: i18n.translate(
                  'xpack.infra.metricDetailPage.sqsMetricsLayout.messagesEmpty.chartLabel',
                  { defaultMessage: 'Empty' }
                ),
              },
            }}
          />
        </SubSection>
        <SubSection
          id="awsSQSOldestMessage"
          label={i18n.translate(
            'xpack.infra.metricDetailPage.sqsMetricsLayout.oldestMessage.sectionLabel',
            {
              defaultMessage: 'Oldest Message',
            }
          )}
        >
          <ChartSectionVis
            type="bar"
            formatter="abbreviatedNumber"
            seriesOverrides={{
              oldest: {
                color: theme.euiTheme.colors.vis.euiColorVis1,
                name: i18n.translate(
                  'xpack.infra.metricDetailPage.sqsMetricsLayout.oldestMessage.chartLabel',
                  { defaultMessage: 'Age' }
                ),
              },
            }}
          />
        </SubSection>
      </Section>
    </EuiPanel>
  )
);
