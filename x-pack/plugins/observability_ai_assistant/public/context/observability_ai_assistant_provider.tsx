/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext } from 'react';
import type { ObservabilityAIAssistantService } from '../types';

export const ObservabilityAIAssistantContext = createContext<
  ObservabilityAIAssistantService | undefined
>(undefined);

export const ObservabilityAIAssistantProvider = ObservabilityAIAssistantContext.Provider;
