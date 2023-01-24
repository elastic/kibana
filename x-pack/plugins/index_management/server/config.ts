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
const schemaLatest = schema.object(
  {
    ui: schema.object({
      enabled: schema.boolean({ defaultValue: true }),
    }),
  },
  { defaultValue: undefined }
);

const configLatest: PluginConfigDescriptor<IndexManagementConfig> = {
  exposeToBrowser: {
    ui: true,
  },
  schema: schemaLatest,
  deprecations: () => [],
};

export type IndexManagementConfig = TypeOf<typeof schemaLatest>;

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

export type IndexManagementConfig7x = TypeOf<typeof schema7x>;

const config7x: PluginConfigDescriptor<IndexManagementConfig7x> = {
  exposeToBrowser: {
    ui: true,
  },
  schema: schema7x,
  deprecations: () => [
    (completeConfig, rootPath, addDeprecation) => {
      if (get(completeConfig, 'xpack.index_management.enabled') === undefined) {
        return completeConfig;
      }

      addDeprecation({
        configPath: 'xpack.index_management.enabled',
        level: 'critical',
        title: i18n.translate('xpack.idxMgmt.deprecations.enabledTitle', {
          defaultMessage: 'Setting "xpack.index_management.enabled" is deprecated',
        }),
        message: i18n.translate('xpack.idxMgmt.deprecations.enabledMessage', {
          defaultMessage:
            'To disallow users from accessing the Index Management UI, use the "xpack.index_management.ui.enabled" setting instead of "xpack.index_management.enabled".',
        }),
        correctiveActions: {
          manualSteps: [
            i18n.translate('xpack.idxMgmt.deprecations.enabled.manualStepOneMessage', {
              defaultMessage: 'Open the kibana.yml config file.',
            }),
            i18n.translate('xpack.idxMgmt.deprecations.enabled.manualStepTwoMessage', {
              defaultMessage:
                'Change the "xpack.index_management.enabled" setting to "xpack.index_management.ui.enabled".',
            }),
          ],
        },
      });
      return completeConfig;
    },
  ],
};

export const config: PluginConfigDescriptor<IndexManagementConfig | IndexManagementConfig7x> =
  kibanaVersion.major < 8 ? config7x : configLatest;
