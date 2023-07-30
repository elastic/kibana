/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  isJavaAgentName,
  isJRubyAgent,
  isAWSLambdaAgent,
} from '../../../../common/agent_name';
import { useApmServiceContext } from '../../../context/apm_service/use_apm_service_context';
import { ServerlessMetrics } from './serverless_metrics';
import { ServiceMetrics } from './service_metrics';
import { JvmMetricsOverview } from './jvm_metrics_overview';
import { JsonMetricsDashboard } from './static_dashboard';
import { hasDashboardFile } from './static_dashboard/helper';

export function Metrics() {
  const { agentName, runtimeName, serverlessType } = useApmServiceContext();
  const isAWSLambda = isAWSLambdaAgent(serverlessType);

  if (isAWSLambda) {
    return <ServerlessMetrics />;
  }

  const hasStaticDashboard = hasDashboardFile({
    agentName,
    runtimeName,
    serverlessType,
  });

  if (hasStaticDashboard) {
    return (
      <JsonMetricsDashboard
        agentName={agentName}
        runtimeName={runtimeName}
        serverlessType={serverlessType}
      />
    );
  }

  if (
    !isAWSLambda &&
    (isJavaAgentName(agentName) || isJRubyAgent(agentName, runtimeName))
  ) {
    return <JvmMetricsOverview />;
  }

  return <ServiceMetrics />;
}
