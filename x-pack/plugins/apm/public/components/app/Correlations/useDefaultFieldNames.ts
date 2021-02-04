/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isRumAgentName } from '../../../../common/agent_name';
import { useApmServiceContext } from '../../../context/apm_service/use_apm_service_context';

export function useDefaultFieldNames() {
  const { agentName } = useApmServiceContext();
  const isRumAgent = isRumAgentName(agentName);
  return isRumAgent
    ? [
        // 'labels',
        'user_agent.name',
        'user_agent.os.name',
        'url.original',
        // 'user fields'
      ]
    : [
        // 'labels',
        'service.version',
        'service.node.name',
        'host.ip',
      ];
}
