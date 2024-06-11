/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { InvestigateWidgetCreate } from '@kbn/investigate-plugin/common';
import { registerAssistantResponseWidget } from './assistant_response_widget';
import { RegisterWidgetOptions } from './register_widgets';
import { registerUserPromptWidget } from './user_prompt_widget';

export type UserPromptWidgetCreate = InvestigateWidgetCreate<{
  prompt: string;
  user: { name: string };
}>;

export type AssistantResponseWidgetCreate = InvestigateWidgetCreate<{
  content: string;
}>;

export function registerAssistantWidgets(options: RegisterWidgetOptions) {
  registerUserPromptWidget(options);
  registerAssistantResponseWidget(options);
}
