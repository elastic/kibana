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

export function Metrics() {
  const { agentName, runtimeName, cloudProviderAndService } = useApmServiceContext();
  const isAWSLambda = isAWSLambdaAgent(cloudProviderAndService);

  if (
    !isAWSLambda &&
    (isJavaAgentName(agentName) || isJRubyAgent(agentName, runtimeName))
  ) {
    return <JvmMetricsOverview />;
  }

  if (isAWSLambda) {
    return <ServerlessMetrics />;
  }

  return <ServiceMetrics />;
}
