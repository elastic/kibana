/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { sortBy } from 'lodash';
import { isRight } from 'fp-ts/lib/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';
import { AgentName } from '../../../typings/es_schemas/ui/fields/agent';
import { booleanRt } from '../runtime_types/boolean_rt';
import { getIntegerRt } from '../runtime_types/integer_rt';
import { isRumAgentName } from '../../agent_name';
import { floatRt } from '../runtime_types/float_rt';
import { RawSettingDefinition, SettingDefinition } from './types';
import { generalSettings } from './general_settings';
import { javaSettings } from './java_settings';
import { getDurationRt } from '../runtime_types/duration_rt';
import { getBytesRt } from '../runtime_types/bytes_rt';

function getSettingDefaults(setting: RawSettingDefinition): SettingDefinition {
  switch (setting.type) {
    case 'select':
      return { validation: t.string, ...setting };

    case 'boolean':
      return { validation: booleanRt, ...setting };

    case 'text':
      return { validation: t.string, ...setting };

    case 'integer': {
      const { min, max } = setting;

      return {
        validation: getIntegerRt({ min, max }),
        min,
        max,
        ...setting,
      };
    }

    case 'float': {
      return {
        validation: floatRt,
        ...setting,
      };
    }

    case 'bytes': {
      const units = setting.units ?? ['b', 'kb', 'mb'];
      const min = setting.min ?? '0b';
      const max = setting.max;

      return {
        validation: getBytesRt({ min, max }),
        units,
        min,
        ...setting,
      };
    }

    case 'duration': {
      const units = setting.units ?? ['ms', 's', 'm'];
      const min = setting.min ?? '1ms';
      const max = setting.max;

      return {
        validation: getDurationRt({ min, max }),
        units,
        min,
        ...setting,
      };
    }

    default:
      return setting;
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

export function validateSetting(setting: SettingDefinition, value: unknown) {
  const result = setting.validation.decode(value);
  const message = PathReporter.report(result)[0];
  const isValid = isRight(result);
  return { isValid, message };
}

export const settingDefinitions: SettingDefinition[] = sortBy(
  [...generalSettings, ...javaSettings].map(getSettingDefaults),
  'key'
);
