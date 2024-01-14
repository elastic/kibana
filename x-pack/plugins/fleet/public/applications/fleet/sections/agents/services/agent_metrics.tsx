/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLink, EuiToolTip } from '@elastic/eui';

import type { AgentMetrics, AgentPolicy, Agent } from '../../../../../../common/types';
import { useAgentDashboardLink } from '../agent_details_page/hooks';

import { MetricNonAvailable } from '../components';

export const AgentCPU: React.FunctionComponent<{
  agent: Agent;
  agentPolicy?: AgentPolicy;
}> = ({ agent, agentPolicy }) => {
  const { isInstalled, link, isLoading } = useAgentDashboardLink(agent);
  const metrics = agent.metrics;
  return typeof metrics?.cpu_avg !== 'undefined' ? (
    <EuiToolTip content={`${(metrics.cpu_avg * 100).toFixed(4)} %`}>
      <EuiLink href={link} disabled={!isInstalled || isLoading}>
        <>{(metrics.cpu_avg * 100).toFixed(2)} %</>
      </EuiLink>
    </EuiToolTip>
  ) : (
    <MetricNonAvailable agentPolicy={agentPolicy} />
  );
};

export function formatAgentMemory(metrics?: AgentMetrics, agentPolicy?: AgentPolicy) {
  return metrics?.memory_size_byte_avg ? (
    formatBytes(metrics.memory_size_byte_avg)
  ) : (
    <MetricNonAvailable agentPolicy={agentPolicy} />
  );
}

export function formatBytes(bytes: number, decimals = 0) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
