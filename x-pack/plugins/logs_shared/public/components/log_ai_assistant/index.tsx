/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { ComponentType } from 'react';
import { Optional } from '@kbn/utility-types';
import { dynamic } from '../../../common/dynamic';
import type { LogAIAssistantDeps } from './log_ai_assistant';

export const LogAIAssistant = dynamic(() => import('./log_ai_assistant'));

interface LogAIAssistantFactoryDeps {
  observabilityAIAssistant: LogAIAssistantDeps['observabilityAIAssistant'];
}

export type LogAIAssistantComponent = ComponentType<
  Optional<LogAIAssistantDeps, 'observabilityAIAssistant'>
>;

export function createLogAIAssistant({
  observabilityAIAssistant: aiAssistant,
}: LogAIAssistantFactoryDeps): LogAIAssistantComponent {
  return ({ observabilityAIAssistant = aiAssistant, ...props }) => (
    <LogAIAssistant observabilityAIAssistant={observabilityAIAssistant} {...props} />
  );
}
