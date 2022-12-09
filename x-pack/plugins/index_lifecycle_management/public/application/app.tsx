/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { Router, Routes, Route, Navigate } from 'react-router-dom';
import { ScopedHistory } from '@kbn/core/public';
import { METRIC_TYPE } from '@kbn/analytics';

import { useKibana, useExecutionContext } from '../shared_imports';
import { UIM_APP_LOAD } from './constants';
import { EditPolicy } from './sections/edit_policy';
import { PolicyList } from './sections/policy_list';
import { trackUiMetric } from './services/ui_metric';
import { ROUTES } from './services/navigation';

export const App = ({ history }: { history: ScopedHistory }) => {
  const {
    services: { executionContext },
  } = useKibana();

  useEffect(() => trackUiMetric(METRIC_TYPE.LOADED, UIM_APP_LOAD), []);

  useExecutionContext(executionContext!, {
    type: 'application',
    page: 'indexLifecycleManagement',
  });

  return (
    <Router navigator={history} location={history.location}>
      <Routes>
        <Route path="/" element={<Navigate to={ROUTES.list} />} />
        <Route path={ROUTES.list} element={PolicyList} />
        <Route path={ROUTES.edit} element={EditPolicy} />
      </Routes>
    </Router>
  );
};
