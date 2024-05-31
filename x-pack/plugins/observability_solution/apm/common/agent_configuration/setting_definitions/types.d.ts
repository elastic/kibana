/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { AgentName } from '../../../typings/es_schemas/ui/fields/agent';

// TODO: is it possible to get rid of `any`?
export type SettingValidation = t.Type<any, string, unknown>;

interface BaseSetting {
  /**
   * UI: unique key to identify setting
   */
  key: string;

  /**
   * UI: Human readable name of setting
   */
  label: string;

  /**
   * UI: Human readable name of setting
   * Not used yet
   */
  category?: string;

  /**
   * UI: Default value set by agent
   */
  defaultValue?: string;

  /**
   * UI: description of setting
   */
  description: string;

  /**
   * UI: placeholder to show in input field
   */
  placeholder?: string;

  /**
   * Limits the setting to no agents, except those specified in `includeAgents`
   */
  includeAgents?: AgentName[];

  /**
   * Limits the setting to all agents, except those specified in `excludeAgents`
   */
  excludeAgents?: AgentName[];
}

interface TextSetting extends BaseSetting {
  type: 'text';
  validation?: SettingValidation;
}

interface SelectSetting extends BaseSetting {
  type: 'select';
  options: Array<{ text: string; value: string }>;
  validation?: SettingValidation;
}

interface BooleanSetting extends BaseSetting {
  type: 'boolean';
}

interface FloatSetting extends BaseSetting {
  type: 'float';
}

interface IntegerSetting extends BaseSetting {
  type: 'integer';
  min?: number;
  max?: number;
}

interface BytesSetting extends BaseSetting {
  type: 'bytes';
  min?: string;
  max?: string;
  units?: string[];
}

interface StorageSizeSetting extends BaseSetting {
  type: 'storageSize';
  min?: string;
  max?: string;
  units?: string[];
}

interface DurationSetting extends BaseSetting {
  type: 'duration';
  min?: string;
  max?: string;
  units?: string[];
}

export type RawSettingDefinition =
  | TextSetting
  | FloatSetting
  | IntegerSetting
  | SelectSetting
  | BooleanSetting
  | BytesSetting
  | StorageSizeSetting
  | DurationSetting;

export type SettingDefinition = RawSettingDefinition & {
  /**
   * runtime validation of input
   */
  validation: SettingValidation;
};
