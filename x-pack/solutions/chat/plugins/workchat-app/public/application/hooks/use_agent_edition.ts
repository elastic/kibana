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
  avatarColor?: string;
  avatarCustomText?: string;
  useCase?: string;
  public: boolean;
}

const emptyState = (): AgentEditState => {
  return {
    name: '',
    description: '',
    systemPrompt: '',
    avatarColor: undefined,
    avatarCustomText: '',
    useCase: '',
    public: false,
  };
};

export const useAgentEdition = ({
  agentId,
  onSaveSuccess,
  onSaveError,
}: {
  agentId?: string;
  onSaveSuccess: (agent: Agent) => void;
  onSaveError?: (err: Error) => void;
}) => {
  const { agentService } = useWorkChatServices();

  const [state, setState] = useState<AgentEditState>(emptyState());
  const [isSubmitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    const fetchAgent = async () => {
      if (agentId) {
        const agent = await agentService.get(agentId);
        setState({
          name: agent.name,
          description: agent.description,
          systemPrompt: agent.configuration.systemPrompt ?? '',
          public: agent.public,
          useCase: agent.configuration.useCase ?? '',
          avatarColor: agent.avatar.color,
          avatarCustomText: agent.avatar.text ?? '',
        });
      }
    };
    fetchAgent();
  }, [agentId, agentService]);

  const submit = useCallback(
    (updatedAgent: AgentEditState) => {
      setSubmitting(true);

      const payload = {
        name: updatedAgent.name,
        description: updatedAgent.description,
        configuration: {
          systemPrompt: updatedAgent.systemPrompt,
          useCase: updatedAgent.useCase,
        },
        avatar: {
          color: updatedAgent.avatarColor,
          text: updatedAgent.avatarCustomText,
        },
        public: updatedAgent.public,
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
          if (onSaveError) {
            onSaveError(err);
          }
        }
      );
    },
    [agentId, agentService, onSaveSuccess, onSaveError]
  );

  return {
    state,
    isSubmitting,
    submit,
  };
};
