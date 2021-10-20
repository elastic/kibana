/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';
import type {
  ConfigDeprecation,
  ConfigDeprecationProvider,
  PluginInitializerContext,
} from 'src/core/server';

export const ConfigSchema = schema.object({
  enabled: schema.boolean({ defaultValue: true }),
  maxSpaces: schema.number({ defaultValue: 1000 }),
});

export function createConfig$(context: PluginInitializerContext) {
  return context.config.create<TypeOf<typeof ConfigSchema>>();
}

const disabledDeprecation: ConfigDeprecation = (config, fromPath, addDeprecation) => {
  if ('enabled' in (config?.xpack?.spaces || {})) {
    addDeprecation({
      configPath: 'xpack.spaces.enabled',
      title: i18n.translate('xpack.spaces.deprecations.enabledTitle', {
        defaultMessage: 'Setting "xpack.spaces.enabled" is deprecated',
      }),
      message: i18n.translate('xpack.spaces.deprecations.enabledMessage', {
        defaultMessage:
          'This setting will be removed in 8.0 and the Spaces plugin will always be enabled.',
      }),
      level: 'critical',
      correctiveActions: {
        manualSteps: [
          i18n.translate('xpack.spaces.deprecations.enabled.manualStepOneMessage', {
            defaultMessage: `Remove "xpack.spaces.enabled" from kibana.yml.`,
          }),
        ],
      },
    });
  }
};

export const spacesConfigDeprecationProvider: ConfigDeprecationProvider = () => {
  return [disabledDeprecation];
};

export type ConfigType = ReturnType<typeof createConfig$> extends Observable<infer P>
  ? P
  : ReturnType<typeof createConfig$>;
