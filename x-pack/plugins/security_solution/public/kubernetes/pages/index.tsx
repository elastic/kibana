/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable react/jsx-no-literals */

import React from 'react';
import { Route, Switch } from 'react-router-dom';
import { SecuritySolutionPageWrapper } from '../../common/components/page_wrapper';
import { KUBERNETES_PATH, SecurityPageName } from '../../../common/constants';
import { SpyRoute } from '../../common/utils/route/spy_routes';

export const KubernetesContainer = React.memo(() => {
  return (
    <SecuritySolutionPageWrapper noPadding>
      <Switch>
        <Route strict exact path={KUBERNETES_PATH}>
          <div>
            <span>this is where the place is</span>
          </div>
        </Route>
      </Switch>
      <SpyRoute pageName={SecurityPageName.case} />
    </SecuritySolutionPageWrapper>
  );
});

KubernetesContainer.displayName = 'KubernetesContainer';
