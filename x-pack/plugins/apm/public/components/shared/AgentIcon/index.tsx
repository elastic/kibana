/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { AgentName } from '../../../../typings/es_schemas/ui/fields/agent';
import { useTheme } from '../../../hooks/use_theme';
import { getAgentIcon } from './get_agent_icon';

interface Props {
  agentName: AgentName;
}

export function AgentIcon(props: Props) {
  const theme = useTheme();
  const { agentName } = props;
  const size = theme.eui.euiIconSizes.large;
  const icon = getAgentIcon(agentName);

  return <img src={icon} height={size} width={size} alt={agentName} />;
}
