/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { METRIC_TYPE } from '@kbn/analytics';
import { Router, Routes, Route, Navigate } from 'react-router-dom';
import { ScopedHistory } from '@kbn/core/public';

import { UIM_APP_LOAD } from '../../common/constants';
import { useExecutionContext } from '../shared_imports';
import { IndexManagementHome, homeSections } from './sections/home';
import { TemplateCreate } from './sections/template_create';
import { TemplateClone } from './sections/template_clone';
import { TemplateEdit } from './sections/template_edit';
import { useAppContext } from './app_context';
import {
  ComponentTemplateCreate,
  ComponentTemplateEdit,
  ComponentTemplateClone,
} from './components';

export const App = ({ history }: { history: ScopedHistory }) => {
  const { core, services } = useAppContext();

  useEffect(
    () => services.uiMetricService.trackMetric(METRIC_TYPE.LOADED, UIM_APP_LOAD),
    [services.uiMetricService]
  );

  useExecutionContext(core.executionContext, {
    type: 'application',
    page: 'indexManagement',
  });

  return (
    <Router navigator={history} location={history.location}>
      <AppWithoutRouter />
    </Router>
  );
};

// Export this so we can test it with a different router.
export const AppWithoutRouter = () => (
  <Routes>
    <Route path="/create_template" element={TemplateCreate} />
    <Route path="/clone_template/:name*" element={TemplateClone} />
    <Route path="/edit_template/:name*" element={TemplateEdit} />
    <Route path="/create_component_template" element={ComponentTemplateCreate} />
    <Route
      path="/create_component_template/:sourceComponentTemplateName"
      children={ComponentTemplateClone}
    />
    <Route path="/edit_component_template/:name*" element={ComponentTemplateEdit} />
    <Route path={`/:section(${homeSections.join('|')})`} element={IndexManagementHome} />
    <Route path="/" element={<Navigate to={`/indices`} />} />
  </Routes>
);
