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
import { RulesPage } from '../detections/pages/detection_engine/rules';
import { CreateRulePage } from '../detections/pages/detection_engine/rules/create';
import { RuleDetailsPage } from '../detections/pages/detection_engine/rules/details';
import { EditRulePage } from '../detections/pages/detection_engine/rules/edit';

const RulesSubRoutes = [
  {
    path: '/rules/id/:detailName/edit',
    main: EditRulePage,
  },
  {
    path: '/rules/id/:detailName',
    main: RuleDetailsPage,
  },
  {
    path: '/rules/create',
    main: CreateRulePage,
  },
  {
    path: '/rules',
    exact: true,
    main: RulesPage,
  },
];

export const RulesRoutes = () => {
  return (
    <TrackApplicationView viewId={SecurityPageName.rules}>
      <Switch>
        {RulesSubRoutes.map((route, index) => (
          <Route key={`rules-route-${route.path}`} path={route.path} exact={route?.exact ?? false}>
            <route.main />
          </Route>
        ))}
      </Switch>
    </TrackApplicationView>
  );
};

export const routes = [
  {
    path: RULES_PATH,
    render: RulesRoutes,
  },
];
