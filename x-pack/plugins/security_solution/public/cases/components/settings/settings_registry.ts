/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { CaseSetting, CaseSettingsRegistry } from './types';

export const createCaseSettingsRegistry = (): CaseSettingsRegistry => {
  const settings: Map<string, CaseSetting> = new Map();

  return {
    has: (id: string) => settings.has(id),
    register: (setting: CaseSetting) => {
      if (settings.has(setting.id)) {
        throw new Error(
          i18n.translate(
            'xpack.securitySolution.caseSettingsRegistry.register.duplicateCaseSettingErrorMessage',
            {
              defaultMessage: 'Object type "{id}" is already registered.',
              values: {
                id: setting.id,
              },
            }
          )
        );
      }

      settings.set(setting.id, setting);
    },
    get: (id: string) => {
      if (!settings.has(id)) {
        throw new Error(
          i18n.translate(
            'xpack.securitySolution.caseSettingsRegistry.get.missingCaseSettingErrorMessage',
            {
              defaultMessage: 'Object type "{id}" is not registered.',
              values: {
                id,
              },
            }
          )
        );
      }
      return settings.get(id)!;
    },
    list: () => {
      return Array.from(settings).map(([id, setting]) => setting);
    },
  };
};
