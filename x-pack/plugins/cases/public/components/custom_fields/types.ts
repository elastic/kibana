/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';

export type CustomFieldTypesUI = 'Text' | 'List' | 'Toggle';

export interface CustomFieldBuilderArgs {
  appId?: string;
  customFieldType: CustomFieldTypesUI;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component?: React.FunctionComponent<any>;
  componentProps?: Record<string, unknown>;
  customFieldPath?: string;
}

export type CustomFieldBuilder = (args: CustomFieldBuilderArgs) => {
  build: () => React.ReactNode[];
};

export type CustomFieldBuilderMap = Record<CustomFieldTypesUI, CustomFieldBuilder>;
