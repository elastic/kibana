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

export const getTaskTypes = (http: HttpSetup, provider?: string): Promise<InferenceTaskType[]> => {
  return Promise.resolve([
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
          value: null,
          ui_restrictions: [],
          default_value: null,
          depends_on: [],
        },
      },
    },
    {
      task_type: 'text_embedding',
      configuration: {
        input_type: {
          display: DisplayType.DROPDOWN,
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
          label: 'Input type',
          order: 1,
          required: false,
          sensitive: false,
          tooltip: '',
          type: FieldType.STRING,
          validations: [],
          value: null,
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
          value: null,
          ui_restrictions: [],
          default_value: null,
          depends_on: [],
        },
        user: {
          display: DisplayType.TEXTBOX,
          label: 'User',
          order: 3,
          required: false,
          sensitive: false,
          tooltip: '',
          type: FieldType.STRING,
          validations: [],
          value: null,
          ui_restrictions: [],
          default_value: null,
          depends_on: [],
        },
      },
    } as InferenceTaskType,
  ]);
};
