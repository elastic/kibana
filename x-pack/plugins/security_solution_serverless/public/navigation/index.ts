/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APP_PATH } from '@kbn/security-solution-plugin/common';
import type { Services } from '../common/services';
import { subscribeBreadcrumbs } from './breadcrumbs';
import { initSideNavigation } from './side_navigation';
import { enableManagementCardsLanding } from './management_cards';

export const startNavigation = (services: Services) => {
  services.serverless.setProjectHome(APP_PATH);

  initSideNavigation(services);
  enableManagementCardsLanding(services);
  subscribeBreadcrumbs(services);
};
