/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';

export type SettingValidation = t.Type<any, string, unknown>;

interface BaseSetting {
  key: string;
  rowTitle?: string;
  rowDescription?: string;
  label?: string;
  helpText?: string;
  placeholder?: string;
  prependIcon?: string;
  labelAppend?: string;
  settings?: SettingDefinition[];
  validation?: SettingValidation;
  required?: boolean;
}

interface TextSetting extends BaseSetting {
  type: 'text';
}

interface ComboSetting extends BaseSetting {
  type: 'combo';
}

interface AreaSetting extends BaseSetting {
  type: 'area';
}

interface BooleanSetting extends BaseSetting {
  type: 'boolean';
}

interface IntegerSetting extends BaseSetting {
  type: 'integer';
}

interface BytesSetting extends BaseSetting {
  type: 'bytes';
}

interface DurationSetting extends BaseSetting {
  type: 'duration';
}

interface AdvancedSettings extends BaseSetting {
  type: 'advanced_option';
  settings: SettingDefinition[];
}

export type SettingDefinition =
  | TextSetting
  | ComboSetting
  | AreaSetting
  | IntegerSetting
  | BooleanSetting
  | BytesSetting
  | DurationSetting
  | AdvancedSettings;
