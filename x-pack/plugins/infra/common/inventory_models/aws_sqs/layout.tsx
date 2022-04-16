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
import { LayoutPropsWithTheme } from '../../../public/pages/metrics/metric_detail/types';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { Section } from '../../../public/pages/metrics/metric_detail/components/section';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { SubSection } from '../../../public/pages/metrics/metric_detail/components/sub_section';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ChartSectionVis } from '../../../public/pages/metrics/metric_detail/components/chart_section_vis';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { LayoutContent } from '../../../public/pages/metrics/metric_detail/components/layout_content';

export const Layout = withTheme(({ metrics, onChangeRangeTime, theme }: LayoutPropsWithTheme) => (
  <React.Fragment>
    <LayoutContent>
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
                color: theme.eui.euiColorVis1,
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
                color: theme.eui.euiColorVis1,
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
                color: theme.eui.euiColorVis1,
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
                color: theme.eui.euiColorVis1,
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
                color: theme.eui.euiColorVis1,
                name: i18n.translate(
                  'xpack.infra.metricDetailPage.sqsMetricsLayout.oldestMessage.chartLabel',
                  { defaultMessage: 'Age' }
                ),
              },
            }}
          />
        </SubSection>
      </Section>
    </LayoutContent>
  </React.Fragment>
));
