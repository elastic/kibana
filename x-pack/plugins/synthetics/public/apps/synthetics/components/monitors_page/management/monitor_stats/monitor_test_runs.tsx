/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useTheme } from '@kbn/observability-plugin/public';
import { ReportTypes } from '@kbn/observability-plugin/public';

import { ClientPluginsStart } from '../../../../../../plugin';
import { useGetMonitorEmbeddedFilters } from '../list_filters/use_filters';
import * as labels from '../labels';

interface MonitorCompleteCountProps {
  from?: string;
  to?: string;
}

export const MonitorTestRunsCount = ({
  from = 'now-30d',
  to = 'now',
}: MonitorCompleteCountProps) => {
  const { observability } = useKibana<ClientPluginsStart>().services;
  const theme = useTheme();
  const { embeddableReportDefinitions, embeddableFilters } = useGetMonitorEmbeddedFilters();

  const { ExploratoryViewEmbeddable } = observability;

  return (
    <ExploratoryViewEmbeddable
      align="left"
      reportType={ReportTypes.SINGLE_METRIC}
      attributes={[
        {
          time: { from, to },
          reportDefinitions: {
            'monitor.id': [],
            ...embeddableReportDefinitions,
          },
          dataType: 'synthetics',
          selectedMetricField: 'monitor_total_runs',
          filters: embeddableFilters,
          name: labels.TEST_RUNS_LABEL,
          color: theme.eui.euiColorVis1,
        },
      ]}
    />
  );
};
