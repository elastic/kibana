/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

import { CoreSetup } from 'kibana/public';
import { ManagementSetup } from 'src/plugins/management/public';
import { MlStartDependencies } from '../../plugin';

import { ManagementAppMountParams } from '../../../../../../src/plugins/management/public';

export function registerManagementSection(
  management: ManagementSetup | undefined,
  core: CoreSetup<MlStartDependencies>
) {
  if (management !== undefined) {
    return management.sections.section.insightsAndAlerting.registerApp({
      id: 'jobsListLink',
      title: i18n.translate('xpack.ml.management.jobsListTitle', {
        defaultMessage: 'Machine Learning Jobs',
      }),
      order: 2,
      async mount(params: ManagementAppMountParams) {
        const { mountApp } = await import('./jobs_list');
        return mountApp(core, params);
      },
    });
  }
}
