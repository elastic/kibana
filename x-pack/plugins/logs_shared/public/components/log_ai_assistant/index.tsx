/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ObservabilityAIAssistantPluginStart } from '@kbn/observability-ai-assistant-plugin/public';
import React from 'react';
import { dynamic } from '../../../common/dynamic';

export const LogAIAssistant = dynamic(() => import('./log_ai_assistant'));

export function createLogAIAssistant({
  observabilityAIAssistant,
}: {
  observabilityAIAssistant: ObservabilityAIAssistantPluginStart;
}) {
  return ({ ...props }) => (
    <LogAIAssistant observabilityAIAssistant={observabilityAIAssistant} {...props} />
  );
}
