/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type Props, schema } from '@kbn/config-schema';
import { stringifyZodError } from '@kbn/zod-helpers';
import type { SavedObjectsFieldMapping } from '@kbn/core-saved-objects-server';

import { AGENT_POLICY_ADVANCED_SETTINGS } from '../../common/settings';
import { AgentPolicy } from '../types';

type SettingsSection = 'AGENT_POLICY_ADVANCED_SETTINGS';

export function getSettingsSavedObjectMappings(settingSection: SettingsSection): {
  [k: string]: SavedObjectsFieldMapping;
} {
  const settings = getSettings(settingSection);

  const mappings: { [k: string]: SavedObjectsFieldMapping } = {};
  settings.forEach((setting) => {
    if (!setting.saved_object_field) {
      return;
    }
    mappings[setting.saved_object_field.name] = setting.saved_object_field.mapping;
  });

  return mappings;
}

export function getSettingsAPISchema(settingSection: SettingsSection): Props {
  const settings = getSettings(settingSection);

  const validations: Props = {};
  settings.forEach((setting) => {
    if (!setting.api_field) {
      return;
    }
    validations[setting.api_field.name] = schema.maybe(
      schema.nullable(
        schema.any({
          validate: (val: any) => {
            const res = setting.schema.safeParse(val);
            if (!res.success) {
              return stringifyZodError(res.error);
            }
          },
        })
      )
    );
  });

  return validations;
}

export function getSettingsValuesForAgentPolicy(
  settingSection: SettingsSection,
  agentPolicy: AgentPolicy
) {
  const settings = getSettings(settingSection);
  const settingsValues: { [k: string]: any } = {};
  settings.forEach((setting) => {
    if (!setting.saved_object_field) {
      return;
    }

    // @ts-expect-error
    const val = agentPolicy[setting.saved_object_field.name];
    if (val) {
      settingsValues[setting.name] = val;
    }
  });
  return settingsValues;
}

export function getSettings(settingSection: SettingsSection) {
  if (settingSection === 'AGENT_POLICY_ADVANCED_SETTINGS') {
    return AGENT_POLICY_ADVANCED_SETTINGS;
  }

  throw new Error(`Invalid settings section ${settingSection}`);
}
