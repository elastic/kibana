/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import React, { useMemo } from 'react';
import { useEuiTheme } from '@elastic/eui';
import { useMonitorQueryFilters } from '../hooks/use_monitor_query_filters';
import { ERRORS_LABEL } from './monitor_errors_count';
import { ClientPluginsStart } from '../../../../../plugin';

interface Props {
  from: string;
  to: string;
  id: string;
}
export const MonitorErrorSparklines = ({ from, to, id }: Props) => {
  const {
    exploratoryView: { ExploratoryViewEmbeddable },
  } = useKibana<ClientPluginsStart>().services;

  const { euiTheme } = useEuiTheme();
  const { queryIdFilter, locationFilter } = useMonitorQueryFilters();

  const time = useMemo(() => ({ from, to }), [from, to]);

  if (!queryIdFilter) {
    return null;
  }

  return (
    <ExploratoryViewEmbeddable
      id={id}
      reportType="kpi-over-time"
      axisTitlesVisibility={{ x: false, yRight: false, yLeft: false }}
      legendIsVisible={false}
      hideTicks={true}
      attributes={[
        {
          time,
          seriesType: 'area',
          reportDefinitions: queryIdFilter,
          filters: locationFilter,
          dataType: 'synthetics',
          selectedMetricField: 'monitor_errors',
          name: ERRORS_LABEL,
          color: euiTheme.colors.danger,
          operationType: 'unique_count',
        },
      ]}
    />
  );
};
