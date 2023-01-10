/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ReportTypes, useTheme } from '@kbn/observability-plugin/public';
import { AVAILABILITY_LABEL } from './availability_panel';
import { ClientPluginsStart } from '../../../../../plugin';
import { useMonitorQueryId } from '../hooks/use_monitor_query_id';
import { useSelectedLocation } from '../hooks/use_selected_location';

interface AvailabilitySparklinesProps {
  from: string;
  to: string;
}

export const AvailabilitySparklines = (props: AvailabilitySparklinesProps) => {
  const {
    services: {
      observability: { ExploratoryViewEmbeddable },
    },
  } = useKibana<ClientPluginsStart>();
  const monitorId = useMonitorQueryId();

  const theme = useTheme();

  const selectedLocation = useSelectedLocation();

  if (!selectedLocation || !monitorId) {
    return null;
  }

  return (
    <ExploratoryViewEmbeddable
      customHeight="70px"
      reportType={ReportTypes.KPI}
      axisTitlesVisibility={{ x: false, yRight: false, yLeft: false }}
      legendIsVisible={false}
      hideTicks={true}
      attributes={[
        {
          seriesType: 'area',
          time: props,
          name: AVAILABILITY_LABEL,
          dataType: 'synthetics',
          selectedMetricField: 'monitor_availability',
          reportDefinitions: {
            'monitor.id': [monitorId],
            'observer.geo.name': [selectedLocation?.label],
          },
          color: theme.eui.euiColorVis1,
        },
      ]}
    />
  );
};
