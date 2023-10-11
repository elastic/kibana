/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FunctionVisibility, RegisterFunctionDefinition } from '../../common/types';
import type { ObservabilityAIAssistantService } from '../types';
import { compressFields } from '../../common/utils/compressFields';

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
      visibility: FunctionVisibility.System,
      description: `Use this function to get information about indices/datasets available and the fields available on them.

      providing empty string as index name will retrieve all indices
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
          const content: {
            indices: string[];
            fields: string;
            warning?: string;
          } = {
            indices: response.indices,
            fields: '[]',
          };

          const fields = response.fields.map((field) => {
            return `${field.name},${field.type}`;
          });

          // limit to 500 fields
          if (fields.length > 500) {
            fields.length = 500;
            content.warning = 'field list too long';
          }

          content.fields = compressFields(fields);

          return {
            content,
          };
        });
    }
  );
}
