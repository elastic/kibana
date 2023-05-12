/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ReportTypes } from '@kbn/exploratory-view-plugin/public';
import { useTheme } from '@kbn/observability-plugin/public';
import { MEDIAN_DURATION_LABEL } from './duration_panel';
import { useMonitorQueryId } from '../hooks/use_monitor_query_id';
import { ClientPluginsStart } from '../../../../../plugin';
import { useSelectedLocation } from '../hooks/use_selected_location';

interface DurationSparklinesProps {
  from: string;
  to: string;
  id: string;
}

export const DurationSparklines = (props: DurationSparklinesProps) => {
  const {
    services: {
      exploratoryView: { ExploratoryViewEmbeddable },
    },
  } = useKibana<ClientPluginsStart>();
  const monitorId = useMonitorQueryId();
  const theme = useTheme();

  const selectedLocation = useSelectedLocation();

  if (!selectedLocation || !monitorId) {
    return null;
  }

  return (
    <>
      <ExploratoryViewEmbeddable
        id={props.id}
        reportType={ReportTypes.KPI}
        axisTitlesVisibility={{ x: false, yRight: false, yLeft: false }}
        legendIsVisible={false}
        hideTicks={true}
        attributes={[
          {
            seriesType: 'area',
            time: props,
            name: MEDIAN_DURATION_LABEL,
            dataType: 'synthetics',
            selectedMetricField: 'monitor.duration.us',
            reportDefinitions: {
              'monitor.id': [monitorId],
              'observer.geo.name': [selectedLocation?.label],
            },
            color: theme.eui.euiColorVis1,
          },
        ]}
      />
    </>
  );
};
