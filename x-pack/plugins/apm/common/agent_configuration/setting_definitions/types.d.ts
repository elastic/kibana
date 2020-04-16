/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { AgentName } from '../../../typings/es_schemas/ui/fields/agent';

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
   * UI:
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
   * runtime validation of the input
   */
  validation?: t.Type<any, string, unknown>;

  /**
   * UI: error shown when the runtime validation fails
   */
  validationError?: string;

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
}

interface IntegerSetting extends BaseSetting {
  type: 'integer';
  min?: number;
  max?: number;
}

interface FloatSetting extends BaseSetting {
  type: 'float';
}

interface SelectSetting extends BaseSetting {
  type: 'select';
  options: Array<{ text: string; value: string }>;
}

interface BooleanSetting extends BaseSetting {
  type: 'boolean';
}

interface BytesSetting extends BaseSetting {
  type: 'bytes';
  units?: string[];
}

interface DurationSetting extends BaseSetting {
  type: 'duration';
  units?: string[];
  min?: number;
}

export type RawSettingDefinition =
  | TextSetting
  | FloatSetting
  | IntegerSetting
  | SelectSetting
  | BooleanSetting
  | BytesSetting
  | DurationSetting;

export type SettingDefinition = RawSettingDefinition & {
  validation: NonNullable<RawSettingDefinition['validation']>;
};
