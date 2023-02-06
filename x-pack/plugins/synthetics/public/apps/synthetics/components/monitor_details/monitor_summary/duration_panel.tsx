/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ReportTypes } from '@kbn/observability-plugin/public';
import { i18n } from '@kbn/i18n';
import { ClientPluginsStart } from '../../../../../plugin';
import { useMonitorQueryId } from '../hooks/use_monitor_query_id';
import { useSelectedLocation } from '../hooks/use_selected_location';

interface DurationPanelProps {
  from: string;
  to: string;
}

export const DurationPanel = (props: DurationPanelProps) => {
  const {
    services: {
      observability: { ExploratoryViewEmbeddable },
    },
  } = useKibana<ClientPluginsStart>();
  const selectedLocation = useSelectedLocation();

  const monitorId = useMonitorQueryId();

  if (!selectedLocation || !monitorId) {
    return null;
  }

  return (
    <ExploratoryViewEmbeddable
      align="left"
      customHeight="70px"
      reportType={ReportTypes.SINGLE_METRIC}
      attributes={[
        {
          time: props,
          name: AVG_DURATION_LABEL,
          dataType: 'synthetics',
          selectedMetricField: 'monitor_duration',
          reportDefinitions: {
            'monitor.id': [monitorId],
            'observer.geo.name': [selectedLocation?.label],
          },
        },
      ]}
    />
  );
};

export const AVG_DURATION_LABEL = i18n.translate(
  'xpack.synthetics.monitorDetails.summary.avgDuration',
  {
    defaultMessage: 'Avg. duration',
  }
);
