/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import type { CoreSetup } from 'kibana/public';
import type { ManagementSetup } from 'src/plugins/management/public';
import type { UsageCollectionSetup } from 'src/plugins/usage_collection/public';
import type { MlStartDependencies } from '../../plugin';

import type { ManagementAppMountParams } from '../../../../../../src/plugins/management/public';

export function registerManagementSection(
  management: ManagementSetup,
  core: CoreSetup<MlStartDependencies>,
  deps: { usageCollection?: UsageCollectionSetup }
) {
  return management.sections.section.insightsAndAlerting.registerApp({
    id: 'mlLink',
    title: i18n.translate('xpack.ml.management.jobsListTitle', {
      defaultMessage: 'Machine Learning',
    }),
    order: 2,
    async mount(params: ManagementAppMountParams) {
      const { mountApp } = await import('./jobs_list');
      return mountApp(core, params, deps);
    },
  });
}
