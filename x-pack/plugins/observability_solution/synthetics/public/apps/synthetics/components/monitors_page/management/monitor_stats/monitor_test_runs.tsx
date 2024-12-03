/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useTheme } from '@kbn/observability-shared-plugin/public';
import { ReportTypes } from '@kbn/exploratory-view-plugin/public';

import { useMonitorFilters } from '../../hooks/use_monitor_filters';
import { useRefreshedRange } from '../../../../hooks';
import { ClientPluginsStart } from '../../../../../../plugin';
import * as labels from '../labels';
import { useMonitorQueryFilters } from '../../hooks/use_monitor_query_filters';

export const MonitorTestRunsCount = () => {
  const {
    exploratoryView: { ExploratoryViewEmbeddable },
  } = useKibana<ClientPluginsStart>().services;
  const theme = useTheme();

  const { from, to } = useRefreshedRange(30, 'days');
  const filters = useMonitorFilters({});
  const queryFilter = useMonitorQueryFilters();

  return (
    <ExploratoryViewEmbeddable
      dslFilters={queryFilter}
      align="left"
      reportType={ReportTypes.SINGLE_METRIC}
      attributes={[
        {
          filters,
          time: { from, to },
          reportDefinitions: {
            'monitor.type': ['http', 'tcp', 'browser', 'icmp'],
          },
          dataType: 'synthetics',
          selectedMetricField: 'monitor_total_runs',
          name: labels.TEST_RUNS_LABEL,
          color: theme.eui.euiColorVis1,
        },
      ]}
    />
  );
};
