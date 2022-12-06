/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { isServerlessAgent } from '../../../../common/agent_name';
import { useApmServiceContext } from '../../../context/apm_service/use_apm_service_context';
import { useApmParams } from '../../../hooks/use_apm_params';
import { ServerlessMetricsDetails } from './serverless_metrics_details';
import { ServiceNodeMetrics } from './service_node_metrics';

export function MetricsDetails() {
  const {
    path: { id },
  } = useApmParams('/services/{serviceName}/metrics/{id}');
  const { runtimeName } = useApmServiceContext();

  if (isServerlessAgent(runtimeName)) {
    return <ServerlessMetricsDetails serverlessId={id} />;
  }

  return <ServiceNodeMetrics serviceNodeName={id} />;
}
