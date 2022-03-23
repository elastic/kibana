/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiImage, EuiIcon, EuiImageProps } from '@elastic/eui';
import { AgentName } from '../../../../typings/es_schemas/ui/fields/agent';
import { getAgentIcon } from './get_agent_icon';
import { useTheme } from '../../../hooks/use_theme';

interface Props {
  agentName?: AgentName;
  size?: EuiImageProps['size'];
}

export function AgentIcon(props: Props) {
  const { agentName, size = 24 } = props;
  const theme = useTheme();
  const icon = getAgentIcon(agentName, theme.darkMode);

  return <EuiImage src={icon} size={size} alt={`${agentName} icon`} />;
}
