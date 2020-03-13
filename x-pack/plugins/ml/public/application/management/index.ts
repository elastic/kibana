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

import { LICENSE_CHECK_STATE } from '../../../../licensing/public';

import { PLUGIN_ID } from '../../../common/constants/app';
import { MINIMUM_FULL_LICENSE } from '../../../common/license';

import { getJobsListBreadcrumbs } from './breadcrumbs';
import { renderApp } from './jobs_list';

export function initManagementSection(
  pluginsSetup: MlSetupDependencies,
  core: CoreSetup<MlStartDependencies>
) {
  const licensing = pluginsSetup.licensing.license$.pipe(take(1));
  licensing.subscribe(license => {
    if (license.check(PLUGIN_ID, MINIMUM_FULL_LICENSE).state === LICENSE_CHECK_STATE.Valid) {
      const management = pluginsSetup.management;
      const mlSection = management.sections.register({
        id: PLUGIN_ID,
        title: i18n.translate('xpack.ml.management.mlTitle', {
          defaultMessage: 'Machine Learning',
        }),
        order: 100,
        icon: 'machineLearningApp',
      });

      mlSection.registerApp({
        id: 'jobsListLink',
        title: i18n.translate('xpack.ml.management.jobsListTitle', {
          defaultMessage: 'Jobs list',
        }),
        order: 10,
        async mount({ element, setBreadcrumbs }) {
          const [coreStart] = await core.getStartServices();
          setBreadcrumbs(getJobsListBreadcrumbs());
          return renderApp(element, coreStart);
        },
      });
    }
  });
}
