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
    slm_ui: true,
  },
};

const baseSchema = {
  ui: schema.object({
    enabled: schema.boolean({ defaultValue: true }),
  }),
  slm_ui: schema.object({
    enabled: schema.boolean({ defaultValue: true }),
  }),
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
const configLatest: PluginConfigDescriptor<SnapshotRestoreConfig> = {
  ...baseConfig,
  schema: configSchema,
  deprecations,
};

export type SnapshotRestoreConfig = TypeOf<typeof configSchema>;

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
const deprecations7x: PluginConfigDescriptor<SnapshotRestoreConfig7x>['deprecations'] = () => [
  (completeConfig: Record<string, any>, rootPath: string, addDeprecation: AddConfigDeprecation) => {
    if (get(completeConfig, 'xpack.snapshot_restore.enabled') === undefined) {
      return completeConfig;
    }

    addDeprecation({
      title: i18n.translate('xpack.snapshot_restore.deprecations.enabledTitle', {
        defaultMessage: 'Setting "xpack.snapshot_restore.enabled" is deprecated',
      }),
      message: i18n.translate('xpack.snapshot_restore.deprecations.enabledMessage', {
        defaultMessage:
          'Use the "xpack.snapshot_restore.ui.enabled" setting instead of "xpack.snapshot_restore.enabled".',
      }),
      correctiveActions: {
        manualSteps: [
          i18n.translate('xpack.snapshot_restore.deprecations.enabled.manualStepOneMessage', {
            defaultMessage: 'Open the kibana.yml config file.',
          }),
          i18n.translate('xpack.snapshot_restore.deprecations.enabled.manualStepTwoMessage', {
            defaultMessage:
              'Change the "xpack.snapshot_restore.enabled" setting to "xpack.snapshot_restore.ui.enabled".',
          }),
        ],
      },
    });
    return completeConfig;
  },
];
export type SnapshotRestoreConfig7x = TypeOf<typeof configSchema7x>;

const config7x: PluginConfigDescriptor<SnapshotRestoreConfig7x> = {
  ...baseConfig,
  schema: configSchema7x,
  deprecations: deprecations7x,
};

export const config: PluginConfigDescriptor<SnapshotRestoreConfig | SnapshotRestoreConfig7x> =
  kibanaVersion.major < 8 ? config7x : configLatest;
