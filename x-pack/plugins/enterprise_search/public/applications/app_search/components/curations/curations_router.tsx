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
import { BreadcrumbTrail } from '../../../shared/kibana_chrome/generate_breadcrumbs';
import { NotFound } from '../../../shared/not_found';
import {
  ENGINE_CURATIONS_PATH,
  ENGINE_CURATIONS_NEW_PATH,
  ENGINE_CURATION_PATH,
  ENGINE_CURATION_ADD_RESULT_PATH,
} from '../../routes';

import { CURATIONS_TITLE } from './constants';

interface Props {
  engineBreadcrumb: BreadcrumbTrail;
}
export const CurationsRouter: React.FC<Props> = ({ engineBreadcrumb }) => {
  const CURATIONS_BREADCRUMB = [...engineBreadcrumb, CURATIONS_TITLE];

  return (
    <Switch>
      <Route exact path={ENGINE_CURATIONS_PATH}>
        <SetPageChrome trail={CURATIONS_BREADCRUMB} />
        TODO: Curations overview
      </Route>
      <Route exact path={ENGINE_CURATIONS_NEW_PATH}>
        <SetPageChrome trail={[...CURATIONS_BREADCRUMB, 'Create a curation']} />
        TODO: Curation creation view
      </Route>
      <Route exact path={ENGINE_CURATION_PATH}>
        <SetPageChrome trail={[...CURATIONS_BREADCRUMB, 'curation queries']} />
        TODO: Curation view (+ show a NotFound view if ID is invalid)
      </Route>
      <Route exact path={ENGINE_CURATION_ADD_RESULT_PATH}>
        <SetPageChrome
          trail={[...CURATIONS_BREADCRUMB, 'curation queries', 'add result manually']}
        />
        TODO: Curation Add Result view
      </Route>
      <Route>
        <NotFound breadcrumbs={CURATIONS_BREADCRUMB} product={APP_SEARCH_PLUGIN} />
      </Route>
    </Switch>
  );
};
