/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';

export enum CustomFieldTypes {
  TEXT = 'text',
  TOGGLE = 'toggle',
}

export interface ConfigureCustomFields {
  key: string;
  label: string;
  type: CustomFieldTypes;
  required: boolean;
}
export interface CustomFieldBuildType {
  ConfigurePage: React.FC;
}

export type CustomFieldBuilder = () => {
  id: string;
  label: string;
  build: () => CustomFieldBuildType[];
};

export type CustomFieldBuilderMap = Record<CustomFieldTypes, CustomFieldBuilder>;
