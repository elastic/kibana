/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Route, Switch } from 'react-router-dom';

import { CreateRulePage } from './rules/create';
import { DetectionEnginePage } from './detection_engine';
import { EditRulePage } from './rules/edit';
import { RuleDetailsPage } from './rules/details';
import { RulesPage } from './rules';

const DetectionEngineContainerComponent: React.FC = () => (
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
    <Route path="/rules">
      <RulesPage />
    </Route>
    <Route exact path="" strict>
      <DetectionEnginePage />
    </Route>
  </Switch>
);

export const DetectionEngineContainer = React.memo(DetectionEngineContainerComponent);
