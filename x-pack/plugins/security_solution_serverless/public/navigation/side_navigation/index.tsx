/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type Services } from '../../common/services';

export const initSideNavigation = (services: Services) => {
  import('./project_navigation').then(({ init }) => {
    const { navigationTree$, panelContentProvider, dataTestSubj } = init(services);
    services.serverless.initNavigation('security', navigationTree$, {
      panelContentProvider,
      dataTestSubj,
    });
  });
};
