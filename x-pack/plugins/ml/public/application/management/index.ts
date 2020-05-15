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

import { PLUGIN_ID, PLUGIN_ICON } from '../../../common/constants/app';
import { MINIMUM_FULL_LICENSE } from '../../../common/license';

export function initManagementSection(
  pluginsSetup: MlSetupDependencies,
  core: CoreSetup<MlStartDependencies>
) {
  const licensing = pluginsSetup.licensing.license$.pipe(take(1));
  licensing.subscribe(license => {
    const management = pluginsSetup.management;
    if (
      management !== undefined &&
      license.check(PLUGIN_ID, MINIMUM_FULL_LICENSE).state === 'valid'
    ) {
      const mlSection = management.sections.register({
        id: PLUGIN_ID,
        title: i18n.translate('xpack.ml.management.mlTitle', {
          defaultMessage: 'Machine Learning',
        }),
        order: 100,
        icon: PLUGIN_ICON,
      });

      mlSection.registerApp({
        id: 'jobsListLink',
        title: i18n.translate('xpack.ml.management.jobsListTitle', {
          defaultMessage: 'Jobs list',
        }),
        order: 10,
        async mount(params) {
          const { mountApp } = await import('./jobs_list');
          return mountApp(core, params);
        },
      });
    }
  });
}
