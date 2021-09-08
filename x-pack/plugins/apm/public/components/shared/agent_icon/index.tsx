/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiIconProps } from '@elastic/eui';
import { EuiIcon } from '@elastic/eui';
import React from 'react';
import type { AgentName } from '../../../../typings/es_schemas/ui/fields/agent';
import { useTheme } from '../../../hooks/use_theme';
import { getAgentIcon } from './get_agent_icon';

interface Props {
  agentName?: AgentName;
  size?: EuiIconProps['size'];
}

export function AgentIcon(props: Props) {
  const { agentName, size = 'l' } = props;
  const theme = useTheme();
  const icon = getAgentIcon(agentName, theme.darkMode);

  return <EuiIcon type={icon} size={size} title={agentName} />;
}
