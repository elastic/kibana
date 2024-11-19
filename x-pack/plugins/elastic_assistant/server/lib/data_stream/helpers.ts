/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { DEFAULT_NAMESPACE_STRING } from '@kbn/core-saved-objects-utils-server';
import { IIndexPatternString } from '../../types';

export const getIndexTemplateAndPattern = (
  context: string,
  namespace?: string
): IIndexPatternString => {
  const concreteNamespace = namespace ? namespace : DEFAULT_NAMESPACE_STRING;
  const pattern = `${context}`;
  const patternWithNamespace = `${pattern}-${concreteNamespace}`;
  return {
    pattern: `${patternWithNamespace}*`,
    basePattern: `${pattern}-*`,
    name: `${patternWithNamespace}-000001`,
    alias: `${patternWithNamespace}`,
  };
};
