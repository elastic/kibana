/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useParams } from 'react-router-dom';
import { ClientPluginsStart } from '../../../../../plugin';

export const MonitorDurationTrend = () => {
  const { observability } = useKibana<ClientPluginsStart>().services;

  const { ExploratoryViewEmbeddable } = observability;

  const { monitorId } = useParams<{ monitorId: string }>();

  const metricsToShow = ['min', 'max', 'median', '25th', '75th'];

  return (
    <ExploratoryViewEmbeddable
      customHeight={'300px'}
      reportType="kpi-over-time"
      attributes={metricsToShow.map((metric) => ({
        dataType: 'synthetics',
        time: {
          from: 'now-30d/d',
          to: 'now',
        },
        name: metric + ' Series',
        selectedMetricField: 'monitor.duration.us',
        reportDefinitions: {
          'monitor.id': [monitorId],
        },
        seriesType: 'line',
        operationType: metric,
      }))}
    />
  );
};
