/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Switch } from 'react-router-dom';
import { Route } from '@kbn/shared-ux-router';
import React, { memo } from 'react';
import { MANAGEMENT_ROUTING_ENTITY_ANALYTICS } from '../../common/constants';
import { NotFoundPage } from '../../../app/404';
import { EntityAnalyticsManagementPage } from '../../../risk_score/pages/entity_analytics_management_page';

export const EntityAnalyticsContainer = memo(() => {
  return (
    <Switch>
      <Route
        path={MANAGEMENT_ROUTING_ENTITY_ANALYTICS}
        exact
        component={EntityAnalyticsManagementPage}
      />
      <Route path="*" component={NotFoundPage} />
    </Switch>
  );
});

EntityAnalyticsContainer.displayName = 'EntityAnalyticsContainer';
