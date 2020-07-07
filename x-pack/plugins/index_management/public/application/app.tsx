/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';

import { Router, Switch, Route, Redirect } from 'react-router-dom';
import { ScopedHistory } from 'kibana/public';

import { UIM_APP_LOAD } from '../../common/constants';
import { IndexManagementHome, homeSections } from './sections/home';
import { TemplateCreate } from './sections/template_create';
import { TemplateClone } from './sections/template_clone';
import { TemplateEdit } from './sections/template_edit';

import { useServices } from './app_context';
import {
  ComponentTemplateCreate,
  ComponentTemplateEdit,
  ComponentTemplateClone,
} from './components';

export const App = ({ history }: { history: ScopedHistory }) => {
  const { uiMetricService } = useServices();
  useEffect(() => uiMetricService.trackMetric('loaded', UIM_APP_LOAD), [uiMetricService]);

  return (
    <Router history={history}>
      <AppWithoutRouter />
    </Router>
  );
};

// Export this so we can test it with a different router.
export const AppWithoutRouter = () => (
  <Switch>
    <Route exact path="/create_template" component={TemplateCreate} />
    <Route exact path="/clone_template/:name*" component={TemplateClone} />
    <Route exact path="/edit_template/:name*" component={TemplateEdit} />
    <Route exact path="/create_component_template" component={ComponentTemplateCreate} />
    <Route
      exact
      path="/create_component_template/:sourceComponentTemplateName"
      component={ComponentTemplateClone}
    />
    <Route exact path="/edit_component_template/:name*" component={ComponentTemplateEdit} />
    <Route path={`/:section(${homeSections.join('|')})`} component={IndexManagementHome} />
    <Redirect from={`/`} to={`/indices`} />
  </Switch>
);
