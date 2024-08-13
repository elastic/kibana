/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core-http-browser';
import { ConfigProperties, DisplayType, FieldType } from '../lib/dynamic_config/types';

export type ProviderConfiguration = Record<string, ConfigProperties | null>;

export interface InferenceProvider {
  provider: string;
  logo?: string;
  configuration: ProviderConfiguration;
}

export const getProviders = (http: HttpSetup, taskType?: string): Promise<InferenceProvider[]> => {
  return Promise.resolve([
    {
      provider: 'openai',
      logo: 'logoElasticsearch', // openai logo here
      configuration: {
        api_key: {
          display: DisplayType.TEXTBOX,
          label: 'API Key',
          order: 1,
          required: true,
          sensitive: true,
          tooltip: `API Key for the provider you're connecting to`,
          type: FieldType.STRING,
          validations: [],
          value: null,
          ui_restrictions: [],
          default_value: null,
          depends_on: [],
        },
        model_id: {
          display: DisplayType.TEXTBOX,
          label: 'Model ID',
          order: 2,
          required: true,
          sensitive: false,
          tooltip: `ID of the LLM you're using`,
          type: FieldType.STRING,
          validations: [],
          value: null,
          ui_restrictions: [],
          default_value: null,
          depends_on: [],
        },
        organization_id: {
          display: DisplayType.TEXTBOX,
          label: 'Organization ID',
          order: 3,
          required: false,
          sensitive: false,
          tooltip: 'Your OrganizationID from the provider',
          type: FieldType.STRING,
          validations: [],
          value: null,
          ui_restrictions: [],
          default_value: null,
          depends_on: [],
        },
        url: {
          display: DisplayType.TEXTBOX,
          label: 'URL',
          order: 4,
          required: false,
          sensitive: false,
          tooltip: '',
          type: FieldType.STRING,
          validations: [],
          value: 'https://api.openai.com/v1/embeddings',
          ui_restrictions: [],
          default_value: 'https://api.openai.com/v1/embeddings',
          depends_on: [],
        },
      },
    },
    {
      provider: 'amazonbedrock',
      logo: 'logoElasticsearch', // openai logo here
      configuration: {
        deployment_id: {
          display: DisplayType.TEXTBOX,
          label: 'Deployment ID',
          order: 1,
          required: true,
          sensitive: true,
          tooltip: `API Key for the provider you're connecting to`,
          type: FieldType.STRING,
          validations: [],
          value: null,
          ui_restrictions: [],
          default_value: null,
          depends_on: [],
        },
        resource_name: {
          display: DisplayType.TEXTBOX,
          label: 'Resource Name',
          order: 2,
          required: true,
          sensitive: false,
          tooltip: `ID of the LLM you're using`,
          type: FieldType.STRING,
          validations: [],
          value: null,
          ui_restrictions: [],
          default_value: null,
          depends_on: [],
        },
        api_version: {
          display: DisplayType.TEXTBOX,
          label: 'API version',
          order: 3,
          required: false,
          sensitive: false,
          tooltip: 'Your OrganizationID from the provider',
          type: FieldType.STRING,
          validations: [],
          value: null,
          ui_restrictions: [],
          default_value: null,
          depends_on: [],
        },
        url: {
          display: DisplayType.TEXTBOX,
          label: 'URL',
          order: 4,
          required: false,
          sensitive: false,
          tooltip: '',
          type: FieldType.STRING,
          validations: [],
          value: 'https://api.openai.com/v1/embeddings',
          ui_restrictions: [],
          default_value: 'https://api.openai.com/v1/embeddings',
          depends_on: [],
        },
      },
    } as InferenceProvider,
    {
      provider: 'elasticsearch',
      logo: 'logoElasticsearch', // openai logo here
      configuration: {
        api_key: {
          display: DisplayType.TEXTBOX,
          label: 'API Key',
          order: 1,
          required: true,
          sensitive: true,
          tooltip: `API Key for the provider you're connecting to`,
          type: FieldType.STRING,
          validations: [],
          value: null,
          ui_restrictions: [],
          default_value: null,
          depends_on: [],
        },
        model_id: {
          display: DisplayType.TEXTBOX,
          label: 'Model ID',
          order: 2,
          required: true,
          sensitive: false,
          tooltip: `ID of the LLM you're using`,
          type: FieldType.STRING,
          validations: [],
          value: null,
          ui_restrictions: [],
          default_value: null,
          depends_on: [],
        },
        organization_id: {
          display: DisplayType.TEXTBOX,
          label: 'Organization ID',
          order: 3,
          required: false,
          sensitive: false,
          tooltip: 'Your OrganizationID from the provider',
          type: FieldType.STRING,
          validations: [],
          value: null,
          ui_restrictions: [],
          default_value: null,
          depends_on: [],
        },
        url: {
          display: DisplayType.TEXTBOX,
          label: 'URL',
          order: 4,
          required: false,
          sensitive: false,
          tooltip: '',
          type: FieldType.STRING,
          validations: [],
          value: 'https://api.openai.com/v1/embeddings',
          ui_restrictions: [],
          default_value: 'https://api.openai.com/v1/embeddings',
          depends_on: [],
        },
      },
    },
  ]);
};
