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
  },
};

const baseSchema = {
  ui: schema.object({
    enabled: schema.boolean({ defaultValue: true }),
  }),
  // Cloud requires the ability to hide internal node attributes from users.
  filteredNodeAttributes: schema.arrayOf(schema.string(), { defaultValue: [] }),
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
const configLatest: PluginConfigDescriptor<IndexLifecycleManagementConfig> = {
  ...baseConfig,
  schema: configSchema,
  deprecations,
};

export type IndexLifecycleManagementConfig = TypeOf<typeof configSchema>;

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
const deprecations7x: PluginConfigDescriptor<IndexLifecycleManagementConfig7x>['deprecations'] =
  () => [
    (
      completeConfig: Record<string, any>,
      rootPath: string,
      addDeprecation: AddConfigDeprecation
    ) => {
      if (get(completeConfig, 'xpack.ilm.enabled') === undefined) {
        return completeConfig;
      }

      addDeprecation({
        title: i18n.translate('xpack.indexLifecycleMgmt.deprecations.enabledTitle', {
          defaultMessage: 'Setting "xpack.ilm.enabled" is deprecated',
        }),
        message: i18n.translate('xpack.indexLifecycleMgmt.deprecations.enabledMessage', {
          defaultMessage: 'Use the "xpack.ilm.ui.enabled" setting instead of "xpack.ilm.enabled".',
        }),
        correctiveActions: {
          manualSteps: [
            i18n.translate('xpack.indexLifecycleMgmt.deprecations.enabled.manualStepOneMessage', {
              defaultMessage: 'Open the kibana.yml config file.',
            }),
            i18n.translate('xpack.indexLifecycleMgmt.deprecations.enabled.manualStepTwoMessage', {
              defaultMessage: 'Change the "xpack.ilm.enabled" setting to "xpack.ilm.ui.enabled".',
            }),
          ],
        },
      });
      return completeConfig;
    },
  ];
export type IndexLifecycleManagementConfig7x = TypeOf<typeof configSchema7x>;

const config7x: PluginConfigDescriptor<IndexLifecycleManagementConfig7x> = {
  ...baseConfig,
  schema: configSchema7x,
  deprecations: deprecations7x,
};

export const config: PluginConfigDescriptor<
  IndexLifecycleManagementConfig | IndexLifecycleManagementConfig7x
> = kibanaVersion.major < 8 ? config7x : configLatest;
