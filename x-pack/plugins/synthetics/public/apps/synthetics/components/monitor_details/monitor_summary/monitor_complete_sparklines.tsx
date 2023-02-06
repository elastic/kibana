/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import React from 'react';
import { useEuiTheme } from '@elastic/eui';
import { COMPLETE_LABEL } from './monitor_complete_count';
import { ClientPluginsStart } from '../../../../../plugin';
import { useMonitorQueryId } from '../hooks/use_monitor_query_id';
import { useSelectedLocation } from '../hooks/use_selected_location';

interface Props {
  from: string;
  to: string;
}
export const MonitorCompleteSparklines = (props: Props) => {
  const { observability } = useKibana<ClientPluginsStart>().services;

  const { ExploratoryViewEmbeddable } = observability;

  const monitorId = useMonitorQueryId();
  const selectedLocation = useSelectedLocation();

  const { euiTheme } = useEuiTheme();

  if (!monitorId || !selectedLocation) {
    return null;
  }

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
          reportDefinitions: {
            'monitor.id': [monitorId],
            'observer.geo.name': [selectedLocation.label],
          },
          dataType: 'synthetics',
          selectedMetricField: 'state.id',
          name: COMPLETE_LABEL,
          color: euiTheme.colors.success,
          operationType: 'unique_count',
        },
      ]}
    />
  );
};
