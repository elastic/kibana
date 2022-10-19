/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ReportTypes } from '@kbn/observability-plugin/public';
import { ClientPluginsStart } from '../../../../../plugin';

import { KpiWrapper } from './kpi_wrapper';
import { useMonitorQueryId } from '../hooks/use_monitor_query_id';

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
  const monitorId = useMonitorQueryId();

  return (
    <KpiWrapper>
      <ExploratoryViewEmbeddable
        reportType={ReportTypes.SINGLE_METRIC}
        attributes={[
          {
            time: props,
            name: 'Monitor duration',
            dataType: 'synthetics',
            selectedMetricField: 'monitor_duration',
            reportDefinitions: { 'monitor.id': [monitorId] },
          },
        ]}
      />
    </KpiWrapper>
  );
};
