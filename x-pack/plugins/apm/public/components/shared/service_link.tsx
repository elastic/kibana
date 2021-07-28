/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLink } from '@elastic/eui';
import React from 'react';
import { useApmRouter } from '../../hooks/use_apm_router';
import { AgentIcon } from './agent_icon';

interface ServiceLinkProps {
  agentName?: string;
  query: Record<string, string | undefined>;
  serviceName: string;
}

export function ServiceLink({
  agentName,
  query,
  serviceName,
}: ServiceLinkProps) {
  const { link } = useApmRouter();

  return (
    <EuiLink
      href={link('/services/:serviceName/overview', {
        path: { serviceName },
        query,
      })}
    >
      <EuiFlexGroup gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <AgentIcon agentName={agentName} />
        </EuiFlexItem>
        <EuiFlexItem>{serviceName}</EuiFlexItem>
      </EuiFlexGroup>
    </EuiLink>
  );
}
