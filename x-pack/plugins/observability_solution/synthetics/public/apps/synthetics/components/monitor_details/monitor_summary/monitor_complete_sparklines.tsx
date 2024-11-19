/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import React from 'react';
import { useEuiTheme } from '@elastic/eui';
import { SUCCESSFUL_LABEL } from './monitor_complete_count';
import { ClientPluginsStart } from '../../../../../plugin';
import { useMonitorQueryFilters } from '../hooks/use_monitor_query_filters';

interface Props {
  from: string;
  to: string;
}
export const MonitorCompleteSparklines = (props: Props) => {
  const {
    exploratoryView: { ExploratoryViewEmbeddable },
  } = useKibana<ClientPluginsStart>().services;

  const { queryIdFilter, locationFilter } = useMonitorQueryFilters();

  const { euiTheme } = useEuiTheme();

  if (!queryIdFilter) {
    return null;
  }

  return (
    <ExploratoryViewEmbeddable
      id="monitorSuccessfulSparklines"
      reportType="kpi-over-time"
      axisTitlesVisibility={{ x: false, yRight: false, yLeft: false }}
      legendIsVisible={false}
      hideTicks={true}
      attributes={[
        {
          seriesType: 'area',
          time: props,
          reportDefinitions: queryIdFilter,
          filters: locationFilter,
          dataType: 'synthetics',
          selectedMetricField: 'monitor_successful',
          name: SUCCESSFUL_LABEL,
          color: euiTheme.colors.success,
          operationType: 'unique_count',
        },
      ]}
    />
  );
};
