/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RegisterContextDefinition, RegisterFunctionDefinition } from '../../common/types';
import type { ObservabilityAIAssistantService } from '../types';
import { registerElasticsearchFunction } from './elasticsearch';
import { registerRecallFunction } from './recall';
import { registerSetupKbFunction } from './setup_kb';
import { registerSummarisationFunction } from './summarise';

export function registerFunctions({
  registerFunction,
  registerContext,
  service,
}: {
  registerFunction: RegisterFunctionDefinition;
  registerContext: RegisterContextDefinition;
  service: ObservabilityAIAssistantService;
}) {
  registerContext({
    name: 'core',
    description:
      'Core functions, like calling Elasticsearch APIs, storing embeddables for instructions or creating base visualisations.',
  });

  registerElasticsearchFunction({ service, registerFunction });
  registerSummarisationFunction({ service, registerFunction });
  registerRecallFunction({ service, registerFunction });
  registerSetupKbFunction({ service, registerFunction });
}
