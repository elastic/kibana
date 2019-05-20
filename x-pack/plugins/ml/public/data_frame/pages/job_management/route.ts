/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uiRoutes from 'ui/routes';

// @ts-ignore
import { checkBasicLicense } from '../../../license/check_license';
// @ts-ignore
import { checkGetDataFrameJobsPrivilege } from '../../../privilege/check_privilege';
// @ts-ignore
import { loadIndexPatterns } from '../../../util/index_utils';
// @ts-ignore
import { getDataFrameBreadcrumbs } from '../../breadcrumbs';

const template = `<ml-nav-menu name="data_frame" /><ml-data-frame-page />`;

uiRoutes.when('/data_frames/?', {
  template,
  k7Breadcrumbs: getDataFrameBreadcrumbs,
  resolve: {
    CheckLicense: checkBasicLicense,
    privileges: checkGetDataFrameJobsPrivilege,
    indexPatterns: loadIndexPatterns,
  },
});
