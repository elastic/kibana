/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core-http-browser';
import { DisplayType, FieldType } from '../lib/dynamic_config/types';
import { FieldsConfiguration } from './types';

export interface InferenceTaskType {
  task_type: string;
  configuration: FieldsConfiguration;
}

// this http param is for the future migrating to real API
export const getTaskTypes = (http: HttpSetup, provider: string): Promise<InferenceTaskType[]> => {
  const providersTaskTypes: Record<string, InferenceTaskType[]> = {
    openai: [
      {
        task_type: 'completion',
        configuration: {
          user: {
            display: DisplayType.TEXTBOX,
            label: 'User',
            order: 1,
            required: false,
            sensitive: false,
            tooltip: 'Specifies the user issuing the request.',
            type: FieldType.STRING,
            validations: [],
            value: '',
            ui_restrictions: [],
            default_value: null,
            depends_on: [],
          },
        },
      },
      {
        task_type: 'text_embedding',
        configuration: {
          user: {
            display: DisplayType.TEXTBOX,
            label: 'User',
            order: 1,
            required: false,
            sensitive: false,
            tooltip: 'Specifies the user issuing the request.',
            type: FieldType.STRING,
            validations: [],
            value: '',
            ui_restrictions: [],
            default_value: null,
            depends_on: [],
          },
        },
      },
    ],
    mistral: [
      {
        task_type: 'text_embedding',
        configuration: {},
      },
    ],
    hugging_face: [
      {
        task_type: 'text_embedding',
        configuration: {},
      },
    ],
    googlevertexai: [
      {
        task_type: 'text_embedding',
        configuration: {
          auto_truncate: {
            display: DisplayType.TOGGLE,
            label: 'Auto truncate',
            order: 1,
            required: false,
            sensitive: false,
            tooltip:
              'Specifies if the API truncates inputs longer than the maximum token length automatically.',
            type: FieldType.BOOLEAN,
            validations: [],
            value: false,
            ui_restrictions: [],
            default_value: null,
            depends_on: [],
          },
        },
      },
      {
        task_type: 'rerank',
        configuration: {
          top_n: {
            display: DisplayType.TOGGLE,
            label: 'Top N',
            order: 1,
            required: false,
            sensitive: false,
            tooltip: 'Specifies the number of the top n documents, which should be returned.',
            type: FieldType.BOOLEAN,
            validations: [],
            value: false,
            ui_restrictions: [],
            default_value: null,
            depends_on: [],
          },
        },
      },
    ],
    googleaistudio: [
      {
        task_type: 'completion',
        configuration: {},
      },
      {
        task_type: 'text_embedding',
        configuration: {},
      },
    ],
    elasticsearch: [
      {
        task_type: 'rerank',
        configuration: {
          return_documents: {
            display: DisplayType.TOGGLE,
            label: 'Return documents',
            options: [],
            order: 1,
            required: false,
            sensitive: false,
            tooltip: 'Returns the document instead of only the index.',
            type: FieldType.BOOLEAN,
            validations: [],
            value: true,
            ui_restrictions: [],
            default_value: null,
            depends_on: [],
          },
        },
      },
      {
        task_type: 'sparse_embedding',
        configuration: {},
      },
      {
        task_type: 'text_embedding',
        configuration: {},
      },
    ],
    cohere: [
      {
        task_type: 'completion',
        configuration: {},
      },
      {
        task_type: 'text_embedding',
        configuration: {
          input_type: {
            display: DisplayType.DROPDOWN,
            label: 'Input type',
            order: 1,
            required: false,
            sensitive: false,
            tooltip: 'Specifies the type of input passed to the model.',
            type: FieldType.STRING,
            validations: [],
            options: [
              {
                label: 'classification',
                value: 'classification',
              },
              {
                label: 'clusterning',
                value: 'clusterning',
              },
              {
                label: 'ingest',
                value: 'ingest',
              },
              {
                label: 'search',
                value: 'search',
              },
            ],
            value: '',
            ui_restrictions: [],
            default_value: null,
            depends_on: [],
          },
          truncate: {
            display: DisplayType.DROPDOWN,
            options: [
              {
                label: 'NONE',
                value: 'NONE',
              },
              {
                label: 'START',
                value: 'START',
              },
              {
                label: 'END',
                value: 'END',
              },
            ],
            label: 'Truncate',
            order: 2,
            required: false,
            sensitive: false,
            tooltip: 'Specifies how the API handles inputs longer than the maximum token length.',
            type: FieldType.STRING,
            validations: [],
            value: '',
            ui_restrictions: [],
            default_value: null,
            depends_on: [],
          },
        },
      },
      {
        task_type: 'rerank',
        configuration: {
          return_documents: {
            display: DisplayType.TOGGLE,
            label: 'Return documents',
            order: 1,
            required: false,
            sensitive: false,
            tooltip: 'Specify whether to return doc text within the results.',
            type: FieldType.BOOLEAN,
            validations: [],
            value: false,
            ui_restrictions: [],
            default_value: null,
            depends_on: [],
          },
          top_n: {
            display: DisplayType.NUMERIC,
            label: 'Top N',
            order: 1,
            required: false,
            sensitive: false,
            tooltip:
              'The number of most relevant documents to return, defaults to the number of the documents.',
            type: FieldType.INTEGER,
            validations: [],
            value: false,
            ui_restrictions: [],
            default_value: null,
            depends_on: [],
          },
        },
      },
    ],
    azureopenai: [
      {
        task_type: 'completion',
        configuration: {
          user: {
            display: DisplayType.TEXTBOX,
            label: 'User',
            order: 1,
            required: false,
            sensitive: false,
            tooltip: 'Specifies the user issuing the request.',
            type: FieldType.STRING,
            validations: [],
            value: '',
            ui_restrictions: [],
            default_value: null,
            depends_on: [],
          },
        },
      },
      {
        task_type: 'text_embedding',
        configuration: {
          user: {
            display: DisplayType.TEXTBOX,
            label: 'User',
            order: 1,
            required: false,
            sensitive: false,
            tooltip: 'Specifies the user issuing the request.',
            type: FieldType.STRING,
            validations: [],
            value: '',
            ui_restrictions: [],
            default_value: null,
            depends_on: [],
          },
        },
      },
    ],
    azureaistudio: [
      {
        task_type: 'completion',
        configuration: {
          user: {
            display: DisplayType.TEXTBOX,
            label: 'User',
            order: 1,
            required: false,
            sensitive: false,
            tooltip: 'Specifies the user issuing the request.',
            type: FieldType.STRING,
            validations: [],
            value: '',
            ui_restrictions: [],
            default_value: null,
            depends_on: [],
          },
        },
      },
      {
        task_type: 'text_embedding',
        configuration: {
          do_sample: {
            display: DisplayType.NUMERIC,
            label: 'Do sample',
            order: 1,
            required: false,
            sensitive: false,
            tooltip: 'Instructs the inference process to perform sampling or not.',
            type: FieldType.INTEGER,
            validations: [],
            value: null,
            ui_restrictions: [],
            default_value: null,
            depends_on: [],
          },
          max_new_tokens: {
            display: DisplayType.NUMERIC,
            label: 'Max new tokens',
            order: 1,
            required: false,
            sensitive: false,
            tooltip: 'Provides a hint for the maximum number of output tokens to be generated.',
            type: FieldType.INTEGER,
            validations: [],
            value: null,
            ui_restrictions: [],
            default_value: null,
            depends_on: [],
          },
          temperature: {
            display: DisplayType.NUMERIC,
            label: 'Temperature',
            order: 1,
            required: false,
            sensitive: false,
            tooltip: 'A number in the range of 0.0 to 2.0 that specifies the sampling temperature.',
            type: FieldType.INTEGER,
            validations: [],
            value: null,
            ui_restrictions: [],
            default_value: null,
            depends_on: [],
          },
          top_p: {
            display: DisplayType.NUMERIC,
            label: 'Top P',
            order: 1,
            required: false,
            sensitive: false,
            tooltip:
              'A number in the range of 0.0 to 2.0 that is an alternative value to temperature. Should not be used if temperature is specified.',
            type: FieldType.INTEGER,
            validations: [],
            value: null,
            ui_restrictions: [],
            default_value: null,
            depends_on: [],
          },
        },
      },
    ],
    amazonbedrock: [
      {
        task_type: 'completion',
        configuration: {
          max_new_tokens: {
            display: DisplayType.NUMERIC,
            label: 'Max new tokens',
            order: 1,
            required: false,
            sensitive: false,
            tooltip: 'Sets the maximum number for the output tokens to be generated.',
            type: FieldType.INTEGER,
            validations: [],
            value: null,
            ui_restrictions: [],
            default_value: null,
            depends_on: [],
          },
          temperature: {
            display: DisplayType.NUMERIC,
            label: 'Temperature',
            order: 1,
            required: false,
            sensitive: false,
            tooltip:
              'A number between 0.0 and 1.0 that controls the apparent creativity of the results.',
            type: FieldType.INTEGER,
            validations: [],
            value: null,
            ui_restrictions: [],
            default_value: null,
            depends_on: [],
          },
          top_p: {
            display: DisplayType.NUMERIC,
            label: 'Top P',
            order: 1,
            required: false,
            sensitive: false,
            tooltip:
              'Alternative to temperature. A number in the range of 0.0 to 1.0, to eliminate low-probability tokens.',
            type: FieldType.INTEGER,
            validations: [],
            value: null,
            ui_restrictions: [],
            default_value: null,
            depends_on: [],
          },
          top_k: {
            display: DisplayType.NUMERIC,
            label: 'Top K',
            order: 1,
            required: false,
            sensitive: false,
            tooltip:
              'Only available for anthropic, cohere, and mistral providers. Alternative to temperature.',
            type: FieldType.INTEGER,
            validations: [],
            value: null,
            ui_restrictions: [],
            default_value: null,
            depends_on: [],
          },
        },
      },
      {
        task_type: 'text_embedding',
        configuration: {},
      },
    ],
    anthropic: [
      {
        task_type: 'completion',
        configuration: {
          max_tokens: {
            display: DisplayType.NUMERIC,
            label: 'Max tokens',
            order: 1,
            required: true,
            sensitive: false,
            tooltip: 'The maximum number of tokens to generate before stopping.',
            type: FieldType.INTEGER,
            validations: [],
            value: null,
            ui_restrictions: [],
            default_value: null,
            depends_on: [],
          },
          temperature: {
            display: DisplayType.TEXTBOX,
            label: 'Temperature',
            order: 2,
            required: false,
            sensitive: false,
            tooltip: 'The amount of randomness injected into the response.',
            type: FieldType.STRING,
            validations: [],
            value: null,
            ui_restrictions: [],
            default_value: null,
            depends_on: [],
          },
          top_p: {
            display: DisplayType.NUMERIC,
            label: 'Top P',
            order: 4,
            required: false,
            sensitive: false,
            tooltip: 'Specifies to use Anthropic’s nucleus sampling.',
            type: FieldType.INTEGER,
            validations: [],
            value: null,
            ui_restrictions: [],
            default_value: null,
            depends_on: [],
          },
          top_k: {
            display: DisplayType.NUMERIC,
            label: 'Top K',
            order: 3,
            required: false,
            sensitive: false,
            tooltip: 'Specifies to only sample from the top K options for each subsequent token.',
            type: FieldType.INTEGER,
            validations: [],
            value: null,
            ui_restrictions: [],
            default_value: null,
            depends_on: [],
          },
        },
      },
    ],
    'alibabacloud-ai-search': [
      {
        task_type: 'text_embedding',
        configuration: {
          input_type: {
            display: DisplayType.DROPDOWN,
            label: 'Input type',
            order: 1,
            required: false,
            sensitive: false,
            tooltip: 'Specifies the type of input passed to the model.',
            type: FieldType.STRING,
            validations: [],
            options: [
              {
                label: 'ingest',
                value: 'ingest',
              },
              {
                label: 'search',
                value: 'search',
              },
            ],
            value: '',
            ui_restrictions: [],
            default_value: null,
            depends_on: [],
          },
        },
      },
      {
        task_type: 'sparse_embedding',
        configuration: {
          input_type: {
            display: DisplayType.DROPDOWN,
            label: 'Input type',
            order: 1,
            required: false,
            sensitive: false,
            tooltip: 'Specifies the type of input passed to the model.',
            type: FieldType.STRING,
            validations: [],
            options: [
              {
                label: 'ingest',
                value: 'ingest',
              },
              {
                label: 'search',
                value: 'search',
              },
            ],
            value: '',
            ui_restrictions: [],
            default_value: null,
            depends_on: [],
          },
          return_token: {
            display: DisplayType.TOGGLE,
            label: 'Return token',
            options: [],
            order: 1,
            required: false,
            sensitive: false,
            tooltip:
              'If `true`, the token name will be returned in the response. Defaults to `false` which means only the token ID will be returned in the response.',
            type: FieldType.BOOLEAN,
            validations: [],
            value: true,
            ui_restrictions: [],
            default_value: null,
            depends_on: [],
          },
        },
      },
      {
        task_type: 'completion',
        configuration: {},
      },
      {
        task_type: 'rerank',
        configuration: {},
      },
    ],
    watsonxai: [
      {
        task_type: 'text_embedding',
        configuration: {},
      },
    ],
  };
  return Promise.resolve(providersTaskTypes[provider]);
};
