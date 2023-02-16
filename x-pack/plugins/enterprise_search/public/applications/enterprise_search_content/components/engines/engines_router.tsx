/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Switch } from 'react-router-dom';

import { useValues } from 'kea';

import { Route } from '@kbn/shared-ux-router';

import { KibanaLogic } from '../../../shared/kibana';
import { ENGINES_PATH, ENGINE_PATH } from '../../routes';

import { EngineRouter } from '../engine/engine_router';
import { NotFound } from '../not_found';

import { EnginesList } from './engines_list';

export const EnginesRouter: React.FC = () => {
  const { productAccess } = useValues(KibanaLogic);
  const enginesSectionEnabled = productAccess.hasSearchEnginesAccess;
  if (!enginesSectionEnabled) {
    return (
      <Switch>
        <Route>
          <NotFound />
        </Route>
      </Switch>
    );
  }
  return (
    <Switch>
      <Route exact path={ENGINES_PATH}>
        <EnginesList />
      </Route>
      <Route path={ENGINE_PATH}>
        <EngineRouter />
      </Route>
      <Route>
        <NotFound />
      </Route>
    </Switch>
  );
};
