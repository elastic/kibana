/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useContext } from 'react';
import { ObservabilityAIAssistantChatServiceContext } from '../context/observability_ai_assistant_chat_service_provider';

export function useObservabilityAIAssistantChatService() {
  const services = useContext(ObservabilityAIAssistantChatServiceContext);

  if (!services) {
    throw new Error(
      'ObservabilityAIAssistantChatServiceContext not set. Did you wrap your component in `<ObservabilityAIAssistantChatServiceProvider/>`?'
    );
  }

  return services;
}
