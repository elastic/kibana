/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState, useEffect } from 'react';
import { useWorkChatServices } from './use_workchat_service';
import type { Agent } from '../../../common/agents';

export interface AgentEditState {
  name: string;
  description: string;
  systemPrompt: string;
  public: boolean;
}

const emptyState = (): AgentEditState => {
  return {
    name: '',
    description: '',
    systemPrompt: '',
    public: false,
  };
};

export const useAgentEdition = ({
  agentId,
  onSaveSuccess,
}: {
  agentId: string | undefined;
  onSaveSuccess: (agent: Agent) => void;
}) => {
  const { agentService } = useWorkChatServices();

  const [editState, setEditState] = useState<AgentEditState>(emptyState());
  const [isSubmitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    const fetchAgent = async () => {
      if (agentId) {
        const agent = await agentService.get(agentId);
        setEditState({
          name: agent.name,
          description: agent.description,
          systemPrompt: agent.configuration.systemPrompt ?? '',
          public: agent.public,
        });
      }
    };
    fetchAgent();
  }, [agentId, agentService]);

  const setFieldValue = <T extends keyof AgentEditState>(key: T, value: AgentEditState[T]) => {
    setEditState((previous) => ({ ...previous, [key]: value }));
  };

  const submit = useCallback(() => {
    setSubmitting(true);

    const payload = {
      name: editState.name,
      description: editState.description,
      configuration: {
        systemPrompt: editState.systemPrompt,
      },
      public: editState.public,
    };

    (agentId ? agentService.update(agentId, payload) : agentService.create(payload)).then(
      (response) => {
        setSubmitting(false);
        if (response.success) {
          onSaveSuccess(response.agent);
        }
      },
      (err) => {
        setSubmitting(false);
      }
    );
  }, [agentId, editState, agentService, onSaveSuccess]);

  return {
    editState,
    isSubmitting,
    setFieldValue,
    submit,
  };
};
