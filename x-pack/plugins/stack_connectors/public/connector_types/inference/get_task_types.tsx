/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core-http-browser';
import { ConfigProperties, DisplayType, FieldType } from '../lib/dynamic_config/types';

export type ProviderConfiguration = Record<string, ConfigProperties | null>;

export interface InferenceTaskType {
  task_type: string;
  configuration: ProviderConfiguration;
}

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
            tooltip: '',
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
            tooltip: '',
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
            tooltip: '',
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
            tooltip: '',
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
    elser: [
      {
        task_type: 'sparse_embedding',
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
            order: 1,
            required: false,
            sensitive: false,
            tooltip: '',
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
            order: 2,
            required: false,
            sensitive: false,
            tooltip: ``,
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
            tooltip: '',
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
            tooltip: '',
            type: FieldType.BOOLEAN,
            validations: [],
            value: false,
            ui_restrictions: [],
            default_value: null,
            depends_on: [],
          },
          top_n: {
            display: DisplayType.TOGGLE,
            label: 'Top N',
            order: 1,
            required: false,
            sensitive: false,
            tooltip: '',
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
            tooltip: '',
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
            tooltip: '',
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
            tooltip: '',
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
            default_value: 64,
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
  };
  return Promise.resolve(providersTaskTypes[provider]);
};
