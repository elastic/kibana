/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AssistantMessage, MessageRole } from '@kbn/inference-common';
import { RootCauseAnalysisEvent } from './types';

export const EMPTY_ASSISTANT_MESSAGE: Extract<RootCauseAnalysisEvent, AssistantMessage> = {
  content: '',
  role: MessageRole.Assistant,
  toolCalls: [],
};
