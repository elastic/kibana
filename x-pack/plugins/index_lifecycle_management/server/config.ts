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
    // Cloud requires the ability to hide internal node attributes from users.
    filteredNodeAttributes: schema.arrayOf(schema.string(), { defaultValue: [] }),
  },
  { defaultValue: undefined }
);

const configLatest: PluginConfigDescriptor<IndexLifecycleManagementConfig> = {
  exposeToBrowser: {
    ui: true,
  },
  schema: schemaLatest,
  deprecations: () => [],
};

export type IndexLifecycleManagementConfig = TypeOf<typeof schemaLatest>;

// -------------------------------
// 7.x
// -------------------------------
const schema7x = schema.object(
  {
    enabled: schema.boolean({ defaultValue: true }),
    ui: schema.object({
      enabled: schema.boolean({ defaultValue: true }),
    }),
    // Cloud requires the ability to hide internal node attributes from users.
    filteredNodeAttributes: schema.arrayOf(schema.string(), { defaultValue: [] }),
  },
  { defaultValue: undefined }
);

export type IndexLifecycleManagementConfig7x = TypeOf<typeof schema7x>;

const config7x: PluginConfigDescriptor<IndexLifecycleManagementConfig7x> = {
  exposeToBrowser: {
    ui: true,
  },
  schema: schema7x,
  deprecations: () => [
    (completeConfig, rootPath, addDeprecation) => {
      if (get(completeConfig, 'xpack.ilm.enabled') === undefined) {
        return completeConfig;
      }

      addDeprecation({
        configPath: 'xpack.ilm.enabled',
        level: 'critical',
        title: i18n.translate('xpack.indexLifecycleMgmt.deprecations.enabledTitle', {
          defaultMessage: 'Setting "xpack.ilm.enabled" is deprecated',
        }),
        message: i18n.translate('xpack.indexLifecycleMgmt.deprecations.enabledMessage', {
          defaultMessage:
            'To disallow users from accessing the Index Lifecycle Policies UI, use the "xpack.ilm.ui.enabled" setting instead of "xpack.ilm.enabled".',
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
  ],
};

export const config: PluginConfigDescriptor<
  IndexLifecycleManagementConfig | IndexLifecycleManagementConfig7x
> = kibanaVersion.major < 8 ? config7x : configLatest;
