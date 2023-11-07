/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { Optional } from '@kbn/utility-types';
import { dynamic } from '../../../common/dynamic';
import type { LogAIAssistantProps } from './log_ai_assistant';

export const LogAIAssistant = dynamic(() => import('./log_ai_assistant'));

interface LogAIAssistantFactoryDeps {
  observabilityAIAssistant: LogAIAssistantProps['aiAssistant'];
}

export function createLogAIAssistant({ observabilityAIAssistant }: LogAIAssistantFactoryDeps) {
  return ({
    aiAssistant = observabilityAIAssistant,
    ...props
  }: Optional<LogAIAssistantProps, 'aiAssistant'>) => (
    <LogAIAssistant aiAssistant={aiAssistant} {...props} />
  );
}
