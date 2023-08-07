/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Serializable } from '@kbn/utility-types';
import type { RegisterFunctionDefinition } from '../../common/types';
import type { ObservabilityAIAssistantService } from '../types';

export function registerSetupKbFunction({
  service,
  registerFunction,
}: {
  service: ObservabilityAIAssistantService;
  registerFunction: RegisterFunctionDefinition;
}) {
  registerFunction(
    {
      name: 'setup_kb',
      contexts: ['core'],
      description:
        'Use this function to set up the knowledge base. ONLY use this if you got an error from the recall or summarise function, or if the user has explicitly requested it. Note that it might take a while (e.g. ten minutes) until the knowledge base is available. Assume it will not be ready for the rest of the current conversation.',
      descriptionForUser:
        'This function allows the assistant to set up an Assistant Knowledge Base for you.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
    ({}, signal) => {
      return service
        .callApi('POST /internal/observability_ai_assistant/functions/setup_kb', {
          signal,
        })
        .then((response) => ({ content: response as unknown as Serializable }));
    }
  );
}
