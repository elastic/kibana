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
      if index is provided and it doesnt match any indices in elasticsearch list of all indices will be provided as well
      else list of all fields for the given index will be given. if no fields are returned this means no indices were matched by provided index pattern.
      wildcards can be part of index name.`,
      descriptionForUser:
        'This function allows the assistant to get information about available indices and their fields.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          index: {
            type: 'string',
            description:
              'index pattern the user is interested in or empty string to get information about all available indices',
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
        .then((response) => {
          return {
            content: {
              indices: response.indices,
              fields: [
                'fieldName,fieldType',
                ...response.fields.map((field) => {
                  return `${field.name},${field.type}`;
                }),
              ],
            } as unknown as Serializable,
          };
        });
    }
  );
}
