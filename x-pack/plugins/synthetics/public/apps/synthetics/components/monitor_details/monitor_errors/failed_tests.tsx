/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useParams } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { useMonitorQueryId } from '../hooks/use_monitor_query_id';
import { ClientPluginsStart } from '../../../../../plugin';

export const MonitorFailedTests = ({ time }: { time: { to: string; from: string } }) => {
  const { observability } = useKibana<ClientPluginsStart>().services;

  const { ExploratoryViewEmbeddable } = observability;

  const monitorId = useMonitorQueryId();

  const { errorStateId } = useParams<{ errorStateId: string }>();

  if (!monitorId && !errorStateId) {
    return null;
  }

  return (
    <ExploratoryViewEmbeddable
      customHeight={'120px'}
      reportType="heatmap"
      axisTitlesVisibility={{ x: false, yRight: false, yLeft: false }}
      legendIsVisible={false}
      attributes={[
        {
          time,
          reportDefinitions: {
            ...(monitorId ? { 'monitor.id': [monitorId] } : { 'state.id': [errorStateId] }),
          },
          dataType: 'synthetics',
          selectedMetricField: 'failed_tests',
          name: FAILED_TESTS_LABEL,
        },
      ]}
    />
  );
};

export const FAILED_TESTS_LABEL = i18n.translate(
  'xpack.synthetics.monitorDetails.summary.failedTests',
  {
    defaultMessage: 'Failed tests',
  }
);
