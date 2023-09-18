/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Serializable } from '@kbn/utility-types';
import { RegisterFunctionDefinition } from '../../common/types';
import type { ObservabilityAIAssistantService } from '../types';

export function registerGetDatasetInfoFunction({
  service,
  registerFunction,
}: {
  service: ObservabilityAIAssistantService;
  registerFunction: RegisterFunctionDefinition;
}) {
  registerFunction(
    {
      name: 'get_dataset_info',
      contexts: ['core'],
      description: `Use this function to get information about indices/datasets available and the fields available on them.

      providing empty string as index name will retrieve all indices
      if index name matches more than a single index list of matching indices will be provided
      else list of all fields in this index will be given.
      wildcards can be part of index name.

      DO NOT include the user's request. It will be added internally.`,
      descriptionForUser:
        'This function allows the assistant to get information about available dataviews and their fields.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          index: {
            type: 'string',
            description:
              'index name the user is interested in or empty string to get information about all available indices',
          },
        },
        required: ['index'],
      } as const,
    },
    ({ arguments: { index }, messages }, signal) => {
      return service
        .callApi('POST /internal/observability_ai_assistant/functions/get_dataset_info', {
          params: {
            body: {
              index,
            },
          },
          signal,
        })
        .then((response) => ({ content: response as unknown as Serializable }));
    }
  );
}
