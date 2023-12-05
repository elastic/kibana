/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { FieldMap } from '@kbn/alerts-as-data-utils';
import { ClusterComponentTemplate } from '@elastic/elasticsearch/lib/api/types';
import { DEFAULT_NAMESPACE_STRING } from '@kbn/core-saved-objects-utils-server';
import { IIndexPatternString } from '../../types';

const keyword = {
  type: 'keyword' as const,
  ignore_above: 1024,
};

const text = {
  type: 'text' as const,
};

const date = {
  type: 'date' as const,
};

const dynamic = {
  type: 'object' as const,
  dynamic: true,
};

const commonFields: ClusterComponentTemplate['component_template']['template'] = {
  mappings: {
    dynamic_templates: [
      {
        numeric_labels: {
          path_match: 'numeric_labels.*',
          mapping: {
            scaling_factor: 1000000,
            type: 'scaled_float',
          },
        },
      },
    ],
    dynamic: false,
    properties: {
      '@timestamp': date,
      labels: dynamic,
      numeric_labels: dynamic,
      user: {
        properties: {
          id: keyword,
          name: keyword,
        },
      },
      conversation: {
        properties: {
          id: keyword,
          title: text,
          last_updated: date,
        },
      },
      api_config: {
        properties: {
          connectorId: keyword,
          connectorTypeTitle: text,
          model: keyword,
          provider: keyword,
        },
      },
      anonymized_fields: {
        type: 'object',
        properties: {
          field_name: keyword,
          value: {
            type: 'object',
            enabled: false,
          },
          uuid: keyword,
        },
      },
      namespace: keyword,
      messages: {
        type: 'object',
        properties: {
          '@timestamp': date,
          message: {
            type: 'object',
            properties: {
              content: text,
              event: text,
              role: keyword,
            },
          },
        },
      },
      public: {
        type: 'boolean',
      },
    },
  },
};

export const conversationsFieldMap: FieldMap = {
  '@timestamp': {
    type: 'date',
    array: false,
    required: false,
  },
  'user.id': {
    type: 'keyword',
    array: false,
    required: true,
  },
  'user.name': {
    type: 'keyword',
    array: false,
    required: false,
  },
  'conversation.id': {
    type: 'keyword',
    array: false,
    required: false,
  },
  'conversation.title': {
    type: 'object',
    array: false,
    required: false,
  },
  'conversation.last_updated': {
    type: 'object',
    array: false,
    required: false,
  },
  messages: {
    type: 'object',
    array: true,
    required: false,
  },
  'messages.id': {
    type: 'keyword',
    array: false,
    required: true,
  },
  'messages.role': {
    type: 'keyword',
    array: false,
    required: true,
  },
  'messages.event': {
    type: 'keyword',
    array: false,
    required: true,
  },
  'messages.content': {
    type: 'keyword',
    array: false,
    required: false,
  },
  'messages.anonymized_fields': {
    type: 'object',
    array: true,
    required: false,
  },
} as const;

export const mappingComponentName = '.conversations-mappings';
export const totalFieldsLimit = 1000;

export const getIndexTemplateAndPattern = (
  context: string,
  namespace?: string
): IIndexPatternString => {
  const concreteNamespace = namespace ? namespace : DEFAULT_NAMESPACE_STRING;
  const pattern = `${context}`;
  const patternWithNamespace = `${pattern}-${concreteNamespace}`;
  return {
    template: `${patternWithNamespace}-index-template`,
    pattern: `.internal.${patternWithNamespace}-*`,
    basePattern: `.${pattern}-*`,
    name: `.internal.${patternWithNamespace}-000001`,
    alias: `.${patternWithNamespace}`,
  };
};
