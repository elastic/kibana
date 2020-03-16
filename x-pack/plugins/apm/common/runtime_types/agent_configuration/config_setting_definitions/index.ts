/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { isRight } from 'fp-ts/lib/Either';
import { AgentName } from '../../../../typings/es_schemas/ui/fields/agent';
import {
  rawConfigSettingDefinitions,
  RawConfigSettingDefinition
} from './config_setting_definitions';
import { booleanRt } from '../boolean_rt';
import { integerRt } from '../integer_rt';

export type ConfigSettingDefinition = RawConfigSettingDefinition & {
  validation: NonNullable<RawConfigSettingDefinition['validation']>;
};

function getDefaultValidation(
  configSettingDefinition: RawConfigSettingDefinition
) {
  switch (configSettingDefinition.type) {
    case 'boolean':
      return booleanRt;
    case 'text':
      return t.string;
    case 'integer':
      return integerRt;
  }
}

export function filterByAgent(agentName?: AgentName) {
  return (setting: ConfigSettingDefinition) => {
    if (!agentName) {
      return true;
    }

    if (setting.includeAgents) {
      return setting.includeAgents.includes(agentName);
    }

    if (setting.excludeAgents) {
      return !setting.excludeAgents.includes(agentName);
    }

    return true;
  };
}

export function isValid(setting: ConfigSettingDefinition, value: unknown) {
  return isRight(setting.validation.decode(value));
}

// add default validations
export const configSettingDefinitions = rawConfigSettingDefinitions.map(def => {
  const validation = def.validation ?? getDefaultValidation(def);
  if (!validation) {
    throw new Error(`Missing validation for ${def.key}`);
  }
  return {
    ...def,
    validation
  };
});
