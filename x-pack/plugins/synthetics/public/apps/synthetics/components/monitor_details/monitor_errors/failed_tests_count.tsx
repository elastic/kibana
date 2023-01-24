/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import React from 'react';
import { FAILED_TESTS_LABEL } from './failed_tests';
import { ClientPluginsStart } from '../../../../../plugin';
import { useMonitorQueryId } from '../hooks/use_monitor_query_id';

export const FailedTestsCount = (time: { to: string; from: string }) => {
  const { observability } = useKibana<ClientPluginsStart>().services;

  const { ExploratoryViewEmbeddable } = observability;

  const monitorId = useMonitorQueryId();

  if (!monitorId) {
    return null;
  }

  return (
    <ExploratoryViewEmbeddable
      reportType="single-metric"
      attributes={[
        {
          time,
          reportDefinitions: {
            'monitor.id': [monitorId],
          },
          dataType: 'synthetics',
          selectedMetricField: 'monitor_failed_tests',
          name: FAILED_TESTS_LABEL,
        },
      ]}
    />
  );
};
