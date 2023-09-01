/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';

export interface CustomFieldFormSchema<Config = Record<string, unknown>> {
  config: Config;
}

export type CustomFieldTypesUI = 'Text' | 'Textarea' | 'Url' | 'List' | 'Number';

export interface CustomFieldBuilderArgs {
  appId?: string;
  customFieldType: CustomFieldTypesUI;
  component?: React.FunctionComponent<any>;
  componentProps?: Record<string, unknown>;
  customFieldPath?: string;
}

export type CustomFieldBuilder = (args: CustomFieldBuilderArgs) => {
  build: () => React.ReactNode[];
};

export type CustomFieldBuilderMap = Record<CustomFieldTypesUI, CustomFieldBuilder>;
