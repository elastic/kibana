/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useContext } from 'react';
import { ObservabilityAIAssistantAppServiceContext } from '../context/observability_ai_assistant_app_service_provider';

export function useObservabilityAIAssistantAppService() {
  const services = useContext(ObservabilityAIAssistantAppServiceContext);

  if (!services) {
    throw new Error(
      'ObservabilityAIAssistantContext not set. Did you wrap your component in `<ObservabilityAIAssistantProvider/>`?'
    );
  }

  return services;
}
