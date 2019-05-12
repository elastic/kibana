/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uiRoutes from 'ui/routes';

// @ts-ignore
import { checkFullLicense } from '../../../../license/check_license';
// @ts-ignore
import { checkGetJobsPrivilege } from '../../../../privilege/check_privilege';
// @ts-ignore
import { loadCurrentIndexPattern } from '../../../../util/index_utils';
// @ts-ignore
import { getCreateSingleMetricJobBreadcrumbs } from '../../../breadcrumbs';

const template = `<ml-nav-menu name="new_job_single_metric" /><ml-new-job-page />`;

uiRoutes.when('/jobs/new_job/new_new_job/?', {
  template,
  k7Breadcrumbs: getCreateSingleMetricJobBreadcrumbs,
  resolve: {
    CheckLicense: checkFullLicense,
    privileges: checkGetJobsPrivilege,
    indexPattern: loadCurrentIndexPattern,
  },
});
