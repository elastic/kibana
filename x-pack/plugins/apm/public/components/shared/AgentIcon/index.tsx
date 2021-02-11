/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIcon } from '@elastic/eui';
import { AgentName } from '../../../../typings/es_schemas/ui/fields/agent';
import { getAgentIcon } from './get_agent_icon';

interface Props {
  agentName: AgentName;
}

export function AgentIcon(props: Props) {
  const { agentName } = props;
  const icon = getAgentIcon(agentName);

  return <EuiIcon type={icon} size="l" title={agentName} />;
}
