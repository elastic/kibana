/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { Route, Switch } from 'react-router-dom';

import { TrackApplicationView } from '../../../../../src/plugins/usage_collection/public';
import { RULES_PATH, SecurityPageName } from '../../common/constants';
import { NotFoundPage } from '../app/404';
import { RulesPage } from '../detections/pages/detection_engine/rules';
import { CreateRulePage } from '../detections/pages/detection_engine/rules/create';
import { RuleDetailsPage } from '../detections/pages/detection_engine/rules/details';
import { EditRulePage } from '../detections/pages/detection_engine/rules/edit';

const RulesSubRoutes = [
  {
    path: '/rules/id/:detailName/edit',
    main: EditRulePage,
    exact: true,
  },
  {
    path: '/rules/id/:detailName',
    main: RuleDetailsPage,
    exact: true,
  },
  {
    path: '/rules/create',
    main: CreateRulePage,
    exact: true,
  },
  {
    path: '/rules',
    main: RulesPage,
    exact: true,
  },
];

const renderRulesRoutes = () => (
  <TrackApplicationView viewId={SecurityPageName.rules}>
    <Switch>
      {RulesSubRoutes.map((route, index) => (
        <Route key={`rules-route-${route.path}`} path={route.path} exact={route?.exact ?? false}>
          <route.main />
        </Route>
      ))}
      <Route component={NotFoundPage} />
    </Switch>
  </TrackApplicationView>
);

export const routes = [
  {
    path: RULES_PATH,
    render: renderRulesRoutes,
  },
];
