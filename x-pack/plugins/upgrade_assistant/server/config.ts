/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { SemVer } from 'semver';
import { i18n } from '@kbn/i18n';
import { get } from 'lodash';
import { schema, TypeOf } from '@kbn/config-schema';
import { PluginConfigDescriptor, AddConfigDeprecation } from 'src/core/server';

import { MAJOR_VERSION } from '../common/constants';

const kibanaVersion = new SemVer(MAJOR_VERSION);

const baseConfig = {
  exposeToBrowser: {
    ui: true,
    readonly: true,
  },
};

const baseSchema = {
  ui: schema.object({
    enabled: schema.boolean({ defaultValue: true }),
  }),
  /*
   * This will default to true up until the last minor before the next major.
   * In readonly mode, the user will not be able to perform any actions in the UI
   * and will be presented with a message indicating as such.
   */
  readonly: schema.boolean({ defaultValue: true }),
};

// >= 8.x
const configSchema = schema.object(
  {
    ...baseSchema,
  },
  { defaultValue: undefined }
);

// Settings that will be deprecated in the next major
const deprecations: PluginConfigDescriptor['deprecations'] = () => [];

// Config in latest major
const configLatest: PluginConfigDescriptor<UpgradeAssistantConfig> = {
  ...baseConfig,
  schema: configSchema,
  deprecations,
};

export type UpgradeAssistantConfig = TypeOf<typeof configSchema>;

// 7.x
const settings7x = {
  enabled: schema.boolean({ defaultValue: true }),
};

const configSchema7x = schema.object(
  {
    ...baseSchema,
    ...settings7x,
  },
  { defaultValue: undefined }
);

// Settings that will be deprecated in 8.0
const deprecations7x: PluginConfigDescriptor<UpgradeAssistantConfig7x>['deprecations'] = () => [
  (completeConfig: Record<string, any>, rootPath: string, addDeprecation: AddConfigDeprecation) => {
    if (get(completeConfig, 'xpack.upgrade_assistant.enabled') === undefined) {
      return completeConfig;
    }

    addDeprecation({
      title: i18n.translate('xpack.upgrade_assistant.deprecations.enabledTitle', {
        defaultMessage: 'Setting "xpack.upgrade_assistant.enabled" is deprecated',
      }),
      message: i18n.translate('xpack.upgrade_assistant.deprecations.enabledMessage', {
        defaultMessage:
          'Use the "xpack.upgrade_assistant.ui.enabled" setting instead of "xpack.upgrade_assistant.enabled".',
      }),
      correctiveActions: {
        manualSteps: [
          i18n.translate('xpack.upgrade_assistant.deprecations.enabled.manualStepOneMessage', {
            defaultMessage: 'Open the kibana.yml config file.',
          }),
          i18n.translate('xpack.upgrade_assistant.deprecations.enabled.manualStepTwoMessage', {
            defaultMessage:
              'Change the "xpack.upgrade_assistant.enabled" setting to "xpack.upgrade_assistant.ui.enabled".',
          }),
        ],
      },
    });
    return completeConfig;
  },
];
export type UpgradeAssistantConfig7x = TypeOf<typeof configSchema7x>;

const config7x: PluginConfigDescriptor<UpgradeAssistantConfig7x> = {
  ...baseConfig,
  schema: configSchema7x,
  deprecations: deprecations7x,
};

export const config: PluginConfigDescriptor<UpgradeAssistantConfig | UpgradeAssistantConfig7x> =
  kibanaVersion.major < 8 ? config7x : configLatest;
