/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { Route, Switch, useLocation } from 'react-router-dom';

import { useDispatch } from 'react-redux';
import { CreateRulePage } from './rules/create';
import { EditRulePage } from './rules/edit';
import { RuleDetailsPage } from './rules/details';
import { RulesPage } from './rules';
import { SpyRoute } from '../../../common/utils/route/spy_routes';
import { SecurityPageName } from '../../../../common/constants';
import { RouteCapture } from '../../../common/components/endpoint/route_capture';
import { AppAction } from '../../../common/store/actions';
import { AppLocation } from '../../../../common/endpoint/types';

const DetectionEngineContainerComponent: React.FC = () => (
  <>
    <Switch>
      <Route path="/rules/id/:detailName/edit">
        <EditRulePage />
      </Route>
      <Route path="/rules/id/:detailName">
        <RuleDetailsPage />
      </Route>
      <Route path="/rules/create">
        <CreateRulePage />
      </Route>
      <Route exact path="/rules">
        <RulesPage />
      </Route>
      <SpyRoute pageName={SecurityPageName.rules} />
    </Switch>
  </>
);

export const DetectionEngineContainer = React.memo(DetectionEngineContainerComponent);

export const RulesRoutes = [
  {
    path: '/rules/id/:detailName/edit',
    main: () => <EditRulePage />,
  },
  {
    path: '/rules/id/:detailName',
    main: () => <RuleDetailsPage />,
  },
  {
    path: '/rules/create',
    main: () => <CreateRulePage />,
  },
  {
    path: '/rules',
    exact: true,
    main: () => <RulesPage />,
  },
];
