/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface CustomFieldFormSchema<Config = Record<string, unknown>> {
  config: Config;
}

export enum customFieldTypesEnum {
  TEXT = 'string',
  TEXTAREA = 'string',
  URL = 'url',
  LIST = 'list',
  BOOLEAN = 'boolean',
}

export type CustomFieldTypesUI = 'Text' | 'Textarea' | 'Url' | 'List' | 'Boolean';
