/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { dynamic } from '@kbn/shared-ux-utility';
import { LogAIAssistantProps } from './log_ai_assistant';

export const LogAIAssistant = dynamic(() => import('./log_ai_assistant'));

export function createLogAIAssistant({
  observabilityAIAssistant,
}: Pick<LogAIAssistantProps, 'observabilityAIAssistant'>) {
  return (props: Omit<LogAIAssistantProps, 'observabilityAIAssistant'>) => (
    <LogAIAssistant observabilityAIAssistant={observabilityAIAssistant} {...props} />
  );
}
