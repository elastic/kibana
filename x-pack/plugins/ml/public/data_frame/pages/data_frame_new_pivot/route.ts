/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uiRoutes from 'ui/routes';

// @ts-ignore
import { checkBasicLicense } from '../../../license/check_license';
// @ts-ignore
import { checkCreateDataFrameJobsPrivilege } from '../../../privilege/check_privilege';
// @ts-ignore
import { loadCurrentIndexPattern } from '../../../util/index_utils';
// @ts-ignore
import { getDataFrameCreateBreadcrumbs } from '../../breadcrumbs';

const template = `<ml-nav-menu name="new_data_frame" /><ml-new-data-frame />`;

uiRoutes.when('/data_frames/new_job/step/pivot?', {
  template,
  k7Breadcrumbs: getDataFrameCreateBreadcrumbs,
  resolve: {
    CheckLicense: checkBasicLicense,
    privileges: checkCreateDataFrameJobsPrivilege,
    indexPattern: loadCurrentIndexPattern,
  },
});
