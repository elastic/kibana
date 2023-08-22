/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LanguageDefinition, LanguageDefinitionSnippetArguments } from '@kbn/search-api-panels';

import { consoleDefinition } from './console';

export const showTryInConsole = (code: keyof LanguageDefinition) => code in consoleDefinition;

export const getCodeSnippet = (
  language: Partial<LanguageDefinition>,
  key: keyof LanguageDefinition,
  args: LanguageDefinitionSnippetArguments
): string => {
  const snippetVal = language[key];
  if (snippetVal === undefined) return '';
  if (typeof snippetVal === 'string') return snippetVal;
  return snippetVal(args);
};
