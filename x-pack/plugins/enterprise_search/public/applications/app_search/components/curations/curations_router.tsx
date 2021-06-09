/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Route, Switch } from 'react-router-dom';

import { APP_SEARCH_PLUGIN } from '../../../../../common/constants';
import { SetAppSearchChrome as SetPageChrome } from '../../../shared/kibana_chrome';
import { NotFound } from '../../../shared/not_found';
import {
  ENGINE_CURATIONS_PATH,
  ENGINE_CURATIONS_NEW_PATH,
  ENGINE_CURATION_PATH,
} from '../../routes';
import { getEngineBreadcrumbs } from '../engine';

import { CURATIONS_TITLE, CREATE_NEW_CURATION_TITLE } from './constants';
import { Curation } from './curation';
import { Curations, CurationCreation } from './views';

export const CurationsRouter: React.FC = () => {
  const CURATIONS_BREADCRUMB = getEngineBreadcrumbs([CURATIONS_TITLE]);

  return (
    <Switch>
      <Route exact path={ENGINE_CURATIONS_PATH}>
        <SetPageChrome trail={CURATIONS_BREADCRUMB} />
        <Curations />
      </Route>
      <Route exact path={ENGINE_CURATIONS_NEW_PATH}>
        <SetPageChrome trail={[...CURATIONS_BREADCRUMB, CREATE_NEW_CURATION_TITLE]} />
        <CurationCreation />
      </Route>
      <Route path={ENGINE_CURATION_PATH}>
        <Curation curationsBreadcrumb={CURATIONS_BREADCRUMB} />
      </Route>
      <Route>
        <NotFound breadcrumbs={CURATIONS_BREADCRUMB} product={APP_SEARCH_PLUGIN} />
      </Route>
    </Switch>
  );
};
