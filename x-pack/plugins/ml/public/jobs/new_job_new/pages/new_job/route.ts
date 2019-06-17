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
import { loadCurrentIndexPattern, loadCurrentSavedSearch } from '../../../../util/index_utils';
// @ts-ignore
import { getCreateSingleMetricJobBreadcrumbs } from '../../../breadcrumbs';

import { loadNewJobCapabilities } from '../../../../services/new_job_capabilities_service';

import { ml } from '../../../../services/ml_api_service';

const template = `<ml-nav-menu name="new_job_single_metric" /><ml-new-job-page />`;

async function getJobsAndGroups() {
  const existingJobsAndGroups = {
    jobs: [],
    groups: [],
  };
  try {
    const { jobs, groups } = await ml.jobs.getAllJobAndGroupIds();
    existingJobsAndGroups.jobs = jobs;
    existingJobsAndGroups.groups = groups;
    return existingJobsAndGroups;
  } catch (error) {
    return existingJobsAndGroups;
  }
}

uiRoutes.when('/jobs/new_job/new_new_job/:jobType', {
  template,
  k7Breadcrumbs: getCreateSingleMetricJobBreadcrumbs,
  resolve: {
    CheckLicense: checkFullLicense,
    privileges: checkGetJobsPrivilege,
    indexPattern: loadCurrentIndexPattern,
    savedSearch: loadCurrentSavedSearch,
    loadNewJobCapabilities,
    existingJobsAndGroups: getJobsAndGroups,
  },
});
