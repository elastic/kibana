/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { AgentName } from '../../../../typings/es_schemas/ui/fields/agent';
import { getAgentIcon } from './get_agent_icon';
import { px } from '../../../style/variables';

interface Props {
  agentName: AgentName;
}

export function AgentIcon(props: Props) {
  const { agentName } = props;

  const icon = getAgentIcon(agentName);

  return <img src={icon} height={px(24)} alt={agentName} />;
}
