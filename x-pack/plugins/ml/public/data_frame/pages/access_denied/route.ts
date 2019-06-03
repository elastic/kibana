/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uiRoutes from 'ui/routes';

// @ts-ignore
import { getDataFrameBreadcrumbs } from '../../breadcrumbs';

const template = `<ml-nav-menu name="access-denied" /><ml-data-frame-access-denied />`;

uiRoutes.when('/data_frames/access-denied', {
  template,
  k7Breadcrumbs: getDataFrameBreadcrumbs,
});
