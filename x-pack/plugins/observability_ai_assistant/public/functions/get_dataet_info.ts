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
      description: `Use this function to get information about dataviews/datasets available and the fields available on them.

      providing empty string as dataview name will retrieve all dataviews
      if dataview name matches more than a single dataview list of matching dataviews will be provied
      else list of all fields in this dataview will be given

      DO NOT include the user's request. It will be added internally.`,
      descriptionForUser:
        'This function allows the assistant to get information about available dataviews and their fields.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          dataview: {
            type: 'string',
            description:
              'dataview name the user is interested in or empty string to get information about all available dataviews',
          },
          fields: {
            type: 'array',
            items: {
              type: 'string',
              description:
                'field names user is looking for or empty to get all fields for provided dataview',
            },
          },
        },
        required: ['dataview', 'fields'],
      } as const,
    },
    ({ arguments: { dataview, fields }, messages }, signal) => {
      return service
        .callApi('POST /internal/observability_ai_assistant/functions/get_dataset_info', {
          params: {
            body: {
              dataview,
              fields,
            },
          },
          signal,
        })
        .then((response) => ({ content: response as unknown as Serializable }));
    }
  );
}
