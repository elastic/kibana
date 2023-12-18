/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { FieldMap } from '@kbn/alerts-as-data-utils';
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
  id: {
    type: 'keyword',
    array: false,
    required: true,
  },
  title: {
    type: 'keyword',
    array: false,
    required: true,
  },
  is_default: {
    type: 'boolean',
    array: false,
    required: false,
  },
  updated_at: {
    type: 'date',
    array: false,
    required: false,
  },
  created_at: {
    type: 'date',
    array: false,
    required: false,
  },
  messages: {
    type: 'object',
    array: true,
    required: false,
  },
  'messages.@timestamp': {
    type: 'keyword',
    array: false,
    required: true,
  },
  'messages.role': {
    type: 'keyword',
    array: false,
    required: true,
  },
  'messages.is_error': {
    type: 'boolean',
    array: false,
    required: false,
  },
  'messages.content': {
    type: 'keyword',
    array: false,
    required: false,
  },
  'messages.reader': {
    type: 'keyword',
    array: false,
    required: false,
  },
  'messages.replacements': {
    type: 'object',
    array: false,
    required: false,
  },
  'messages.presentation': {
    type: 'object',
    array: false,
    required: false,
  },
  'messages.presentation.delay': {
    type: 'long',
    array: false,
    required: false,
  },
  'messages.presentation.stream': {
    type: 'boolean',
    array: false,
    required: false,
  },
  'messages.trace_data': {
    type: 'object',
    array: false,
    required: false,
  },
  'messages.trace_data.transaction_id': {
    type: 'keyword',
    array: false,
    required: false,
  },
  'messages.trace_data.trace_id': {
    type: 'keyword',
    array: false,
    required: false,
  },
  api_config: {
    type: 'object',
    array: false,
    required: false,
  },
  'api_config.connector_id': {
    type: 'keyword',
    array: false,
    required: false,
  },
  'api_config.connector_type_title': {
    type: 'keyword',
    array: false,
    required: false,
  },
  'api_config.default_system_prompt_id': {
    type: 'keyword',
    array: false,
    required: false,
  },
  'api_config.provider': {
    type: 'keyword',
    array: false,
    required: false,
  },
  'api_config.model': {
    type: 'keyword',
    array: false,
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
    template: `.${patternWithNamespace}-index-template`,
    pattern: `.${patternWithNamespace}*`,
    basePattern: `.${pattern}-*`,
    name: `.${patternWithNamespace}-000001`,
    alias: `.${patternWithNamespace}`,
  };
};
