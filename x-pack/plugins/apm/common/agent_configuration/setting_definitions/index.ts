/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { sortBy } from 'lodash';
import { isRight } from 'fp-ts/lib/Either';
import { i18n } from '@kbn/i18n';
import { AgentName } from '../../../typings/es_schemas/ui/fields/agent';
import { booleanRt } from '../runtime_types/boolean_rt';
import { integerRt } from '../runtime_types/integer_rt';
import { isRumAgentName } from '../../agent_name';
import { numberFloatRt } from '../runtime_types/number_float_rt';
import { bytesRt, BYTE_UNITS } from '../runtime_types/bytes_rt';
import { durationRt, DURATION_UNITS } from '../runtime_types/duration_rt';
import { RawSettingDefinition, SettingDefinition } from './types';
import { generalSettings } from './general_settings';
import { javaSettings } from './java_settings';

function getDefaultsByType(settingDefinition: RawSettingDefinition) {
  switch (settingDefinition.type) {
    case 'boolean':
      return { validation: booleanRt };
    case 'text':
      return { validation: t.string };
    case 'integer':
      return {
        validation: integerRt,
        validationError: i18n.translate(
          'xpack.apm.agentConfig.integer.errorText',
          { defaultMessage: 'Must be an integer' }
        ),
      };
    case 'float':
      return {
        validation: numberFloatRt,
        validationError: i18n.translate(
          'xpack.apm.agentConfig.float.errorText',
          { defaultMessage: 'Must be a number between 0.000 and 1' }
        ),
      };
    case 'bytes':
      return {
        validation: bytesRt,
        units: BYTE_UNITS,
        validationError: i18n.translate(
          'xpack.apm.agentConfig.bytes.errorText',
          { defaultMessage: 'Please specify an integer and a unit' }
        ),
      };
    case 'duration':
      return {
        validation: durationRt,
        units: DURATION_UNITS,
        validationError: i18n.translate(
          'xpack.apm.agentConfig.bytes.errorText',
          { defaultMessage: 'Please specify an integer and a unit' }
        ),
      };
  }
}

export function filterByAgent(agentName?: AgentName) {
  return (setting: SettingDefinition) => {
    // agentName is missing if "All" was selected
    if (!agentName) {
      // options that only apply to certain agents will be filtered out
      if (setting.includeAgents) {
        return false;
      }

      // only options that apply to every agent (ignoring RUM) should be returned
      if (setting.excludeAgents) {
        return setting.excludeAgents.every(isRumAgentName);
      }

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

export function isValid(setting: SettingDefinition, value: unknown) {
  return isRight(setting.validation.decode(value));
}

export const settingDefinitions = sortBy(
  [...generalSettings, ...javaSettings].map((def) => {
    const defWithDefaults = {
      ...getDefaultsByType(def),
      ...def,
    };

    // ensure every option has validation
    if (!defWithDefaults.validation) {
      throw new Error(`Missing validation for ${def.key}`);
    }

    return defWithDefaults as SettingDefinition;
  }),
  'key'
);
