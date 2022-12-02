/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { i18n } from '@kbn/i18n';
import { ClientPluginsStart } from '../../../../../plugin';
import { useMonitorQueryId } from '../hooks/use_monitor_query_id';
import { useSelectedLocation } from '../hooks/use_selected_location';

interface MonitorDurationTrendProps {
  from: string;
  to: string;
}

export const MonitorDurationTrend = (props: MonitorDurationTrendProps) => {
  const { observability } = useKibana<ClientPluginsStart>().services;

  const { ExploratoryViewEmbeddable } = observability;

  const monitorId = useMonitorQueryId();
  const selectedLocation = useSelectedLocation();

  if (!selectedLocation || !monitorId) {
    return null;
  }

  return (
    <ExploratoryViewEmbeddable
      customHeight="240px"
      reportType="kpi-over-time"
      attributes={Object.keys(metricsToShow).map((metric) => ({
        dataType: 'synthetics',
        time: props,
        name: metricsToShow[metric],
        selectedMetricField: 'monitor.duration.us',
        reportDefinitions: {
          'monitor.id': [monitorId],
          'observer.geo.name': [selectedLocation?.label],
        },
        seriesType: 'line',
        operationType: metric,
      }))}
    />
  );
};

const MIN_LABEL = i18n.translate('xpack.synthetics.durationTrend.min', {
  defaultMessage: 'Min',
});

const MAX_LABEL = i18n.translate('xpack.synthetics.durationTrend.max', {
  defaultMessage: 'Max',
});

const MEDIAN_LABEL = i18n.translate('xpack.synthetics.durationTrend.median', {
  defaultMessage: 'Median',
});

const PERCENTILE_25_LABEL = i18n.translate('xpack.synthetics.durationTrend.percentile25', {
  defaultMessage: '25th',
});

const PERCENTILE_75_LABEL = i18n.translate('xpack.synthetics.durationTrend.percentile75', {
  defaultMessage: '75th',
});

const metricsToShow: Record<string, string> = {
  max: MAX_LABEL,
  '75th': PERCENTILE_75_LABEL,
  median: MEDIAN_LABEL,
  '25th': PERCENTILE_25_LABEL,
  min: MIN_LABEL,
};
