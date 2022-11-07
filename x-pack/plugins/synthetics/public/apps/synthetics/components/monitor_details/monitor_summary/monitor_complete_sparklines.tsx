/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import React from 'react';
import { useEuiTheme } from '@elastic/eui';
import { ClientPluginsStart } from '../../../../../plugin';
import { useMonitorQueryId } from '../hooks/use_monitor_query_id';

interface Props {
  from: string;
  to: string;
}
export const MonitorCompleteSparklines = (props: Props) => {
  const { observability } = useKibana<ClientPluginsStart>().services;

  const { ExploratoryViewEmbeddable } = observability;

  const monitorId = useMonitorQueryId();

  const { euiTheme } = useEuiTheme();

  return (
    <ExploratoryViewEmbeddable
      reportType="kpi-over-time"
      axisTitlesVisibility={{ x: false, yRight: false, yLeft: false }}
      legendIsVisible={false}
      hideTicks={true}
      attributes={[
        {
          seriesType: 'area',
          time: props,
          reportDefinitions: { 'monitor.id': [monitorId] },
          dataType: 'synthetics',
          selectedMetricField: 'state.id',
          name: 'Monitor complete',
          color: euiTheme.colors.success,
          operationType: 'unique_count',
        },
      ]}
    />
  );
};
