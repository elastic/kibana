/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import { useEffect, useState } from 'react';

/**
 * True once Agent Builder reports the user can chat: the `agentBuilder.show` capability,
 * the license, and an LLM connector. False without Agent Builder.
 */
export const useAgentBuilderAccess = (
  agentBuilder: Pick<AgentBuilderPluginStart, 'getAgentBuilderAccess'> | undefined
): boolean => {
  const [canChat, setCanChat] = useState(false);
  useEffect(() => {
    if (agentBuilder === undefined) return;
    let active = true;
    agentBuilder.getAgentBuilderAccess().then(
      ({ hasRequiredLicense, hasLlmConnector }) => {
        if (active) setCanChat(hasRequiredLicense && hasLlmConnector);
      },
      () => undefined
    );
    return () => {
      active = false;
    };
  }, [agentBuilder]);
  return canChat;
};
