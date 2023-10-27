/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { Redirect } from 'react-router-dom';
import { Router, Routes, Route } from '@kbn/shared-ux-router';
import { ScopedHistory } from '@kbn/core/public';
import { METRIC_TYPE } from '@kbn/analytics';

import { UIM_APP_LOAD } from './constants';
import { EditPolicy } from './sections/edit_policy';
import { PolicyList } from './sections/policy_list';
import { trackUiMetric } from './services/ui_metric';
import { ROUTES } from './services/navigation';

export const App = ({ history }: { history: ScopedHistory }) => {
  useEffect(() => trackUiMetric(METRIC_TYPE.LOADED, UIM_APP_LOAD), []);

  return (
    <Router history={history}>
      <Routes>
        <Redirect exact from="/" to={ROUTES.list} />
        <Route exact path={ROUTES.list} component={PolicyList} />
        <Route path={ROUTES.edit} component={EditPolicy} />
      </Routes>
    </Router>
  );
};
