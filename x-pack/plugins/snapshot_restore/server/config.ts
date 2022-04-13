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
import { PluginConfigDescriptor } from 'src/core/server';

import { MAJOR_VERSION } from '../common/constants';

const kibanaVersion = new SemVer(MAJOR_VERSION);

// -------------------------------
// >= 8.x
// -------------------------------
const schemaLatest = schema.object(
  {
    ui: schema.object({
      enabled: schema.boolean({ defaultValue: true }),
    }),
    slm_ui: schema.object({
      enabled: schema.boolean({ defaultValue: true }),
    }),
  },
  { defaultValue: undefined }
);

const configLatest: PluginConfigDescriptor<SnapshotRestoreConfig> = {
  exposeToBrowser: {
    ui: true,
    slm_ui: true,
  },
  schema: schemaLatest,
  deprecations: () => [],
};

export type SnapshotRestoreConfig = TypeOf<typeof schemaLatest>;

// -------------------------------
// 7.x
// -------------------------------
const schema7x = schema.object(
  {
    enabled: schema.boolean({ defaultValue: true }),
    ui: schema.object({
      enabled: schema.boolean({ defaultValue: true }),
    }),
    slm_ui: schema.object({
      enabled: schema.boolean({ defaultValue: true }),
    }),
  },
  { defaultValue: undefined }
);

export type SnapshotRestoreConfig7x = TypeOf<typeof schema7x>;

const config7x: PluginConfigDescriptor<SnapshotRestoreConfig7x> = {
  exposeToBrowser: {
    ui: true,
    slm_ui: true,
  },
  schema: schema7x,
  deprecations: () => [
    (completeConfig, rootPath, addDeprecation) => {
      if (get(completeConfig, 'xpack.snapshot_restore.enabled') === undefined) {
        return completeConfig;
      }

      addDeprecation({
        configPath: 'xpack.snapshot_restore.enabled',
        level: 'critical',
        title: i18n.translate('xpack.snapshotRestore.deprecations.enabledTitle', {
          defaultMessage: 'Setting "xpack.snapshot_restore.enabled" is deprecated',
        }),
        message: i18n.translate('xpack.snapshotRestore.deprecations.enabledMessage', {
          defaultMessage:
            'To disallow users from accessing the Snapshot and Restore UI, use the "xpack.snapshot_restore.ui.enabled" setting instead of "xpack.snapshot_restore.enabled".',
        }),
        correctiveActions: {
          manualSteps: [
            i18n.translate('xpack.snapshotRestore.deprecations.enabled.manualStepOneMessage', {
              defaultMessage: 'Open the kibana.yml config file.',
            }),
            i18n.translate('xpack.snapshotRestore.deprecations.enabled.manualStepTwoMessage', {
              defaultMessage:
                'Change the "xpack.snapshot_restore.enabled" setting to "xpack.snapshot_restore.ui.enabled".',
            }),
          ],
        },
      });
      return completeConfig;
    },
  ],
};

export const config: PluginConfigDescriptor<SnapshotRestoreConfig | SnapshotRestoreConfig7x> =
  kibanaVersion.major < 8 ? config7x : configLatest;
