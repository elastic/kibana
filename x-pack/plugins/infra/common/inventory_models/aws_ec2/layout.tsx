/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { withTheme } from '@kbn/kibana-react-plugin/common';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { LayoutPropsWithTheme } from '../../../public/pages/metrics/metric_detail/types';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { Section } from '../../../public/pages/metrics/metric_detail/components/section';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { SubSection } from '../../../public/pages/metrics/metric_detail/components/sub_section';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { LayoutContent } from '../../../public/pages/metrics/metric_detail/components/layout_content';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ChartSectionVis } from '../../../public/pages/metrics/metric_detail/components/chart_section_vis';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { MetadataDetails } from '../../../public/pages/metrics/metric_detail/components/metadata_details';

export const Layout = withTheme(({ metrics, theme, onChangeRangeTime }: LayoutPropsWithTheme) => (
  <React.Fragment>
    <MetadataDetails
      fields={[
        'cloud.instance.id',
        'cloud.provider',
        'cloud.availability_zone',
        'cloud.machine.type',
        'cloud.instance.name',
        'cloud.project.id',
      ]}
    />
    <LayoutContent>
      <Section
        navLabel="AWS EC2"
        sectionLabel={i18n.translate(
          'xpack.infra.metricDetailPage.ec2MetricsLayout.overviewSection.sectionLabel',
          {
            defaultMessage: 'Aws EC2 Overview',
          }
        )}
        metrics={metrics}
        onChangeRangeTime={onChangeRangeTime}
      >
        <SubSection
          id="awsEC2CpuUtilization"
          label={i18n.translate(
            'xpack.infra.metricDetailPage.ec2MetricsLayout.cpuUsageSection.sectionLabel',
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
              total: { color: theme.eui.euiColorVis1 },
            }}
          />
        </SubSection>
        <SubSection
          id="awsEC2NetworkTraffic"
          label={i18n.translate(
            'xpack.infra.metricDetailPage.ec2MetricsLayout.networkTrafficSection.sectionLabel',
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
        <SubSection
          id="awsEC2DiskIOBytes"
          label={i18n.translate(
            'xpack.infra.metricDetailPage.ec2MetricsLayout.diskIOBytesSection.sectionLabel',
            {
              defaultMessage: 'Disk IO (Bytes)',
            }
          )}
        >
          <ChartSectionVis
            formatter="bytes"
            formatterTemplate="{{value}}/s"
            type="area"
            seriesOverrides={{
              write: {
                color: theme.eui.euiColorVis2,
                name: i18n.translate(
                  'xpack.infra.metricDetailPage.ec2MetricsLayout.diskIOBytesSection.writeLabel',
                  {
                    defaultMessage: 'writes',
                  }
                ),
              },
              read: {
                color: theme.eui.euiColorVis1,
                name: i18n.translate(
                  'xpack.infra.metricDetailPage.ec2MetricsLayout.diskIOBytesSection.readLabel',
                  {
                    defaultMessage: 'reads',
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
