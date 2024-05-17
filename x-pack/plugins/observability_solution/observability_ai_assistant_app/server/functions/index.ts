/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RegistrationCallback } from '@kbn/observability-ai-assistant-plugin/server';
import { ObservabilityAIAssistantAppPluginStartDependencies } from '../types';
import { registerAlertsFunction } from './alerts';
import { registerChangesFunction } from './changes';
import { registerLensFunction } from './lens';
import { registerQueryFunction } from './query';
import { registerVisualizeESQLFunction } from './visualize_esql';

export type FunctionRegistrationParameters = Omit<
  Parameters<RegistrationCallback>[0],
  'registerContext' | 'hasFunction'
> & { pluginsStart: ObservabilityAIAssistantAppPluginStartDependencies };

export const registerFunctions = async (registrationParameters: FunctionRegistrationParameters) => {
  registerLensFunction(registrationParameters);
  registerQueryFunction(registrationParameters);
  registerVisualizeESQLFunction(registrationParameters);
  registerAlertsFunction(registrationParameters);
  registerChangesFunction(registrationParameters);
};
