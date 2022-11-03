/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import React from 'react';
import { ReportTypes } from '@kbn/observability-plugin/public';
import { ClientPluginsStart } from '../../../../../plugin';
import { useMonitorQueryId } from '../hooks/use_monitor_query_id';

interface MonitorErrorsCountProps {
  from: string;
  to: string;
}

export const MonitorErrorsCount = (props: MonitorErrorsCountProps) => {
  const { observability } = useKibana<ClientPluginsStart>().services;

  const { ExploratoryViewEmbeddable } = observability;

  const monitorId = useMonitorQueryId();

  return (
    <ExploratoryViewEmbeddable
      customHeight="70px"
      reportType={ReportTypes.SINGLE_METRIC}
      attributes={[
        {
          time: props,
          reportDefinitions: { 'monitor.id': [monitorId] },
          dataType: 'synthetics',
          selectedMetricField: 'monitor_errors',
          name: 'synthetics-series-1',
        },
      ]}
    />
  );
};
