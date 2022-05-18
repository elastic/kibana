/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiPage,
  EuiPageBody,
  EuiFlexGroup,
  EuiPageContent,
  EuiScreenReaderOnly,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

// @ts-ignore could not find declaration file
import { MonitoringTimeseriesContainer } from '../chart';
import { checkAgentTypeMetric } from '../../lib/apm_agent';

interface TitleType {
  title?: string;
  heading?: unknown;
}

interface Stats {
  versions: string[];
  [key: string]: unknown;
}
interface Props {
  stats: Stats;
  metrics: { [key: string]: unknown };
  seriesToShow: unknown[];
  title: string;
  summary: {
    version: string;
    config: {
      container: boolean;
    };
  };
  StatusComponent: React.FC<{ stats: Stats }>;
}

const createCharts = (series: unknown[], props: Partial<Props>) => {
  return series.map((data, index) => {
    return (
      <EuiFlexItem style={{ minWidth: '45%' }} key={index}>
        <MonitoringTimeseriesContainer {...props} series={data} />
      </EuiFlexItem>
    );
  });
};

const getHeading = (isFleetTypeMetric: boolean) => {
  const titles: TitleType = {};
  if (isFleetTypeMetric) {
    titles.title = i18n.translate('xpack.monitoring.apm.metrics.topCharts.agentTitle', {
      defaultMessage: 'Integrations Server - Resource Usage',
    });
    titles.heading = (
      <FormattedMessage
        id="xpack.monitoring.apm.metrics.agentHeading"
        defaultMessage="Integrations Server"
      />
    );
    return titles;
  }
  titles.title = i18n.translate('xpack.monitoring.apm.metrics.topCharts.title', {
    defaultMessage: 'APM Server - Resource Usage',
  });
  titles.heading = (
    <FormattedMessage id="xpack.monitoring.apm.metrics.heading" defaultMessage="APM server" />
  );
  return titles;
};

export const ApmMetrics = ({
  stats,
  metrics,
  seriesToShow,
  title,
  summary,
  StatusComponent,
  ...props
}: Props) => {
  if (!metrics) {
    return null;
  }

  const versions = summary?.version ? [summary?.version] : stats.versions;
  const isFleetTypeMetric = checkAgentTypeMetric(versions);
  const titles = getHeading(isFleetTypeMetric);

  const topSeries = [metrics.apm_cpu, metrics.apm_os_load];
  const { config } = summary || stats;
  topSeries.push(config.container ? metrics.apm_memory_cgroup : metrics.apm_memory);

  return (
    <EuiPage>
      <EuiPageBody>
        <EuiScreenReaderOnly>
          <h1>{titles.heading as FormattedMessage}</h1>
        </EuiScreenReaderOnly>
        <EuiPanel>
          <StatusComponent stats={stats} />
        </EuiPanel>
        <EuiSpacer size="m" />
        <EuiPanel>
          <EuiTitle>
            <h3>{titles.title}</h3>
          </EuiTitle>
          <EuiSpacer size="m" />
          <EuiFlexGroup wrap>{createCharts(topSeries, props)}</EuiFlexGroup>
        </EuiPanel>
        <EuiSpacer size="m" />
        <EuiPageContent>
          <EuiTitle>
            <h3>{title}</h3>
          </EuiTitle>
          <EuiSpacer size="m" />
          <EuiFlexGroup wrap>{createCharts(seriesToShow, props)}</EuiFlexGroup>
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
};
