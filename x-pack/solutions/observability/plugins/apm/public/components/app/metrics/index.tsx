/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  isJavaAgentName,
  isJRubyAgentName,
  isAWSLambdaAgentName,
} from '../../../../common/agent_name';
import { useApmServiceContext } from '../../../context/apm_service/use_apm_service_context';
import { ServerlessMetrics } from './serverless_metrics';
import { ServiceMetrics } from './service_metrics';
import { JvmMetricsOverview } from './jvm_metrics_overview';
import { JsonMetricsDashboard } from './static_dashboard';
import { hasDashboardFile } from './static_dashboard/helper';
import { useAdHocApmDataView } from '../../../hooks/use_adhoc_apm_data_view';
import { isLogsOnlySignal } from '../../../utils/get_signal_type';
import { ServiceTabEmptyState } from '../service_tab_empty_state';

export function Metrics() {
  const { agentName, runtimeName, serverlessType } = useApmServiceContext();
  const isAWSLambda = isAWSLambdaAgentName(serverlessType);
  const { dataView } = useAdHocApmDataView();
  const { serviceEntitySummary } = useApmServiceContext();

  const hasLogsOnlySignal =
    serviceEntitySummary?.dataStreamTypes && isLogsOnlySignal(serviceEntitySummary.dataStreamTypes);

  if (hasLogsOnlySignal) {
    return <ServiceTabEmptyState id="metrics" />;
  }

  if (isAWSLambda) {
    return <ServerlessMetrics />;
  }

  const hasStaticDashboard = hasDashboardFile({
    agentName,
    runtimeName,
    serverlessType,
  });

  if (hasStaticDashboard && dataView) {
    return (
      <JsonMetricsDashboard
        agentName={agentName}
        runtimeName={runtimeName}
        serverlessType={serverlessType}
        dataView={dataView}
      />
    );
  }

  if (!isAWSLambda && (isJavaAgentName(agentName) || isJRubyAgentName(agentName, runtimeName))) {
    return <JvmMetricsOverview />;
  }

  return <ServiceMetrics />;
}
