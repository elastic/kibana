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
import { take } from 'rxjs/operators';

import { CoreSetup } from 'kibana/public';
import { MlStartDependencies, MlSetupDependencies } from '../../plugin';

import {
  ManagementAppMountParams,
  ManagementSectionId,
} from '../../../../../../src/plugins/management/public';
import { PLUGIN_ID } from '../../../common/constants/app';
import { MINIMUM_FULL_LICENSE } from '../../../common/license';

export function initManagementSection(
  pluginsSetup: MlSetupDependencies,
  core: CoreSetup<MlStartDependencies>
) {
  const licensing = pluginsSetup.licensing.license$.pipe(take(1));
  licensing.subscribe((license) => {
    const management = pluginsSetup.management;
    if (
      management !== undefined &&
      license.check(PLUGIN_ID, MINIMUM_FULL_LICENSE).state === 'valid'
    ) {
      management.sections.getSection(ManagementSectionId.InsightsAndAlerting).registerApp({
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
  });
}
