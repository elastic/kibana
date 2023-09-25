/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { METRIC_TYPE } from '@kbn/analytics';
import { Redirect } from 'react-router-dom';
import { Router, Routes, Route } from '@kbn/shared-ux-router';
import { ScopedHistory } from '@kbn/core/public';

import { UIM_APP_LOAD, Section } from '../../common/constants';
import { IndexManagementHome, homeSections } from './sections/home';
import { TemplateCreate } from './sections/template_create';
import { TemplateClone } from './sections/template_clone';
import { TemplateEdit } from './sections/template_edit';
import { EnrichPolicyCreate } from './sections/enrich_policy_create';
import { useAppContext } from './app_context';
import {
  ComponentTemplateCreate,
  ComponentTemplateEdit,
  ComponentTemplateClone,
} from './components';

export const App = ({ history }: { history: ScopedHistory }) => {
  const { services } = useAppContext();
  useEffect(
    () => services.uiMetricService.trackMetric(METRIC_TYPE.LOADED, UIM_APP_LOAD),
    [services.uiMetricService]
  );

  return (
    <Router history={history}>
      <AppWithoutRouter />
    </Router>
  );
};

// Export this so we can test it with a different router.
export const AppWithoutRouter = () => (
  <Routes>
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
    <Route exact path="/enrich_policies/create" component={EnrichPolicyCreate} />
    <Route path={`/:section(${homeSections.join('|')})`} component={IndexManagementHome} />
    <Redirect from={`/`} to={`/${Section.Indices}`} />
  </Routes>
);
