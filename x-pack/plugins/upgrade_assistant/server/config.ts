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
import { PluginConfigDescriptor } from '@kbn/core/server';

import { MAJOR_VERSION } from '../common/constants';

const kibanaVersion = new SemVer(MAJOR_VERSION);

// -------------------------------
// >= 8.x
// -------------------------------
const schemaLatest = schema.object({
  ui: schema.object({
    enabled: schema.boolean({ defaultValue: false }),
  }),
  /*
   * This will default to true up until the last minor before the next major.
   * In readonly mode, the user will not be able to perform any actions in the UI
   * and will be presented with a message indicating as such.
   */
  readonly: schema.boolean({ defaultValue: true }),
});

const configLatest: PluginConfigDescriptor<UpgradeAssistantConfig> = {
  exposeToBrowser: {
    ui: true,
    readonly: true,
  },
  schema: schemaLatest,
  deprecations: () => [],
};

export type UpgradeAssistantConfig = TypeOf<typeof schemaLatest>;

// -------------------------------
// 7.x
// -------------------------------
const schema7x = schema.object({
  enabled: schema.boolean({ defaultValue: true }),
  ui: schema.object({
    enabled: schema.boolean({ defaultValue: true }),
  }),
  /*
   * This will default to true up until the last minor before the next major.
   * In readonly mode, the user will not be able to perform any actions in the UI
   * and will be presented with a message indicating as such.
   */
  readonly: schema.boolean({ defaultValue: false }),
});

export type UpgradeAssistantConfig7x = TypeOf<typeof schema7x>;

const config7x: PluginConfigDescriptor<UpgradeAssistantConfig7x> = {
  exposeToBrowser: {
    ui: true,
    readonly: true,
  },
  schema: schema7x,
  deprecations: () => [
    (completeConfig, rootPath, addDeprecation) => {
      if (get(completeConfig, 'xpack.upgrade_assistant.enabled') === undefined) {
        return completeConfig;
      }

      addDeprecation({
        configPath: 'xpack.upgrade_assistant.enabled',
        level: 'critical',
        title: i18n.translate('xpack.upgradeAssistant.deprecations.enabledTitle', {
          defaultMessage: 'Setting "xpack.upgrade_assistant.enabled" is deprecated',
        }),
        message: i18n.translate('xpack.upgradeAssistant.deprecations.enabledMessage', {
          defaultMessage:
            'To disallow users from accessing the Upgrade Assistant UI, use the "xpack.upgrade_assistant.ui.enabled" setting instead of "xpack.upgrade_assistant.enabled".',
        }),
        correctiveActions: {
          manualSteps: [
            i18n.translate('xpack.upgradeAssistant.deprecations.enabled.manualStepOneMessage', {
              defaultMessage: 'Open the kibana.yml config file.',
            }),
            i18n.translate('xpack.upgradeAssistant.deprecations.enabled.manualStepTwoMessage', {
              defaultMessage:
                'Change the "xpack.upgrade_assistant.enabled" setting to "xpack.upgrade_assistant.ui.enabled".',
            }),
          ],
        },
      });
      return completeConfig;
    },
  ],
};

export const config: PluginConfigDescriptor<UpgradeAssistantConfig | UpgradeAssistantConfig7x> =
  kibanaVersion.major < 8 ? config7x : configLatest;
