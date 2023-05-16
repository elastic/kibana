/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { curlDefinition } from './curl';
import { javascriptDefinition } from './javascript';
import { rubyDefinition } from './ruby';
import { Languages, LanguageDefinition } from './types';

const languageDefinitionRecords: Partial<Record<Languages, LanguageDefinition>> = {
  [Languages.CURL]: curlDefinition,
  [Languages.JAVASCRIPT]: javascriptDefinition,
  [Languages.RUBY]: rubyDefinition,
};

export const languageDefinitions: LanguageDefinition[] = Object.values(languageDefinitionRecords);
