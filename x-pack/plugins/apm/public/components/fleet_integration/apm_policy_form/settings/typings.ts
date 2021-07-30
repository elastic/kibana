/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';

export type SettingValidation = t.Type<any, string, unknown>;

interface AdvancedSettings {
  type: 'advanced_settings';
  settings: SettingDefinition[];
}

export interface Setting {
  type:
    | 'text'
    | 'combo'
    | 'area'
    | 'boolean'
    | 'integer'
    | 'bytes'
    | 'duration';
  key: string;
  rowTitle?: string;
  rowDescription?: string;
  label?: string;
  helpText?: string;
  placeholder?: string;
  labelAppend?: string;
  settings?: SettingDefinition[];
  validation?: SettingValidation;
  required?: boolean;
  readOnly?: boolean;
}

export type SettingDefinition = Setting | AdvancedSettings;
