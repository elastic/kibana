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
  },
  { defaultValue: undefined }
);

const configLatest: PluginConfigDescriptor<LicenseManagementConfig> = {
  exposeToBrowser: {
    ui: true,
  },
  schema: schemaLatest,
  deprecations: () => [],
};

export type LicenseManagementConfig = TypeOf<typeof schemaLatest>;

// -------------------------------
// 7.x
// -------------------------------
const schema7x = schema.object(
  {
    enabled: schema.boolean({ defaultValue: true }),
    ui: schema.object({
      enabled: schema.boolean({ defaultValue: true }),
    }),
  },
  { defaultValue: undefined }
);

export type LicenseManagementConfig7x = TypeOf<typeof schema7x>;

const config7x: PluginConfigDescriptor<LicenseManagementConfig7x> = {
  exposeToBrowser: {
    ui: true,
  },
  schema: schema7x,
  deprecations: () => [
    (completeConfig, rootPath, addDeprecation) => {
      if (get(completeConfig, 'xpack.license_management.enabled') === undefined) {
        return completeConfig;
      }

      addDeprecation({
        configPath: 'xpack.license_management.enabled',
        level: 'critical',
        title: i18n.translate('xpack.licenseMgmt.deprecations.enabledTitle', {
          defaultMessage: 'Setting "xpack.license_management.enabled" is deprecated',
        }),
        message: i18n.translate('xpack.licenseMgmt.deprecations.enabledMessage', {
          defaultMessage:
            'To disallow users from accessing the License Management UI, use the "xpack.license_management.ui.enabled" setting instead of "xpack.license_management.enabled".',
        }),
        correctiveActions: {
          manualSteps: [
            i18n.translate('xpack.licenseMgmt.deprecations.enabled.manualStepOneMessage', {
              defaultMessage: 'Open the kibana.yml config file.',
            }),
            i18n.translate('xpack.licenseMgmt.deprecations.enabled.manualStepTwoMessage', {
              defaultMessage:
                'Change the "xpack.license_management.enabled" setting to "xpack.license_management.ui.enabled".',
            }),
          ],
        },
      });
      return completeConfig;
    },
  ],
};

export const config: PluginConfigDescriptor<LicenseManagementConfig | LicenseManagementConfig7x> =
  kibanaVersion.major < 8 ? config7x : configLatest;
