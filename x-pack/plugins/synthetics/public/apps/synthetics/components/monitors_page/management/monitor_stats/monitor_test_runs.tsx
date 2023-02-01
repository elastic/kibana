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

import { useAbsoluteDate } from '../../../../hooks';
import { ClientPluginsStart } from '../../../../../../plugin';
import * as labels from '../labels';

export const MonitorTestRunsCount = () => {
  const { observability } = useKibana<ClientPluginsStart>().services;
  const theme = useTheme();

  const { ExploratoryViewEmbeddable } = observability;

  const { from: absFrom, to: absTo } = useAbsoluteDate({ from: 'now-30d', to: 'now' });

  return (
    <ExploratoryViewEmbeddable
      align="left"
      reportType={ReportTypes.SINGLE_METRIC}
      attributes={[
        {
          time: { from: absFrom, to: absTo },
          reportDefinitions: {
            'monitor.id': [],
            'observer.geo.name': [],
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
