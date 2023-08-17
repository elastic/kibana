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

import { useRefreshedRange } from '../../../../hooks';
import { ClientPluginsStart } from '../../../../../../plugin';
import * as labels from '../labels';

export const MonitorTestRunsCount = ({ monitorIds }: { monitorIds: string[] }) => {
  const {
    exploratoryView: { ExploratoryViewEmbeddable },
  } = useKibana<ClientPluginsStart>().services;
  const theme = useTheme();

  const { from, to } = useRefreshedRange(30, 'days');

  return (
    <ExploratoryViewEmbeddable
      align="left"
      reportType={ReportTypes.SINGLE_METRIC}
      attributes={[
        {
          time: { from, to },
          reportDefinitions: {
            'monitor.id': monitorIds.length > 0 ? monitorIds : ['false-monitor-id'], // Show no data when monitorIds is empty
          },
          dataType: 'synthetics',
          selectedMetricField: 'monitor_total_runs',
          filters: [],
          name: labels.TEST_RUNS_LABEL,
          color: theme.eui.euiColorVis1,
        },
      ]}
    />
  );
};
