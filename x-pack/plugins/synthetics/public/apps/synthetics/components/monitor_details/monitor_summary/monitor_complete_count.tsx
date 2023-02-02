/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import React from 'react';
import { ReportTypes } from '@kbn/observability-plugin/public';
import { i18n } from '@kbn/i18n';
import { ClientPluginsStart } from '../../../../../plugin';
import { useMonitorQueryId } from '../hooks/use_monitor_query_id';
import { useSelectedLocation } from '../hooks/use_selected_location';

interface MonitorCompleteCountProps {
  from: string;
  to: string;
}

export const MonitorCompleteCount = (props: MonitorCompleteCountProps) => {
  const { observability } = useKibana<ClientPluginsStart>().services;

  const { ExploratoryViewEmbeddable } = observability;

  const monitorId = useMonitorQueryId();
  const selectedLocation = useSelectedLocation();

  if (!monitorId || !selectedLocation) {
    return null;
  }

  return (
    <ExploratoryViewEmbeddable
      align="left"
      reportType={ReportTypes.SINGLE_METRIC}
      attributes={[
        {
          time: props,
          reportDefinitions: {
            'monitor.id': [monitorId],
            'observer.geo.name': [selectedLocation.label],
          },
          dataType: 'synthetics',
          selectedMetricField: 'monitor_complete',
          name: COMPLETE_LABEL,
        },
      ]}
    />
  );
};

export const COMPLETE_LABEL = i18n.translate('xpack.synthetics.monitorDetails.summary.complete', {
  defaultMessage: 'Complete',
});
