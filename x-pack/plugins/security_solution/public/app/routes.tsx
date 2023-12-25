/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { History } from 'history';
import type { FC } from 'react';
import React, { memo, useEffect } from 'react';
import { Router, Routes, Route } from '@kbn/shared-ux-router';
import { useDispatch } from 'react-redux';
import type { AppLeaveHandler } from '@kbn/core/public';

import { APP_ID } from '../../common/constants';
import { RouteCapture } from '../common/components/endpoint/route_capture';
import { useKibana } from '../common/lib/kibana';
import type { AppAction } from '../common/store/actions';
import { ManageRoutesSpy } from '../common/utils/route/manage_spy_routes';
import { NotFoundPage } from './404';
import { HomePage } from './home';

interface RouterProps {
  children: React.ReactNode;
  history: History;
  onAppLeave: (handler: AppLeaveHandler) => void;
}

const PageRouterComponent: FC<RouterProps> = ({ children, history, onAppLeave }) => {
  const { cases } = useKibana().services;
  const CasesContext = cases.ui.getCasesContext();
  const userCasesPermissions = cases.helpers.canUseCases([APP_ID]);
  const dispatch = useDispatch<(action: AppAction) => void>();
  useEffect(() => {
    return () => {
      // When app is dismounted via a non-router method (ex. using Kibana's `services.application.navigateToApp()`)
      // ensure that one last `userChangedUrl` store action is dispatched, which will help trigger state reset logic
      dispatch({
        type: 'userChangedUrl',
        payload: { pathname: '', search: '', hash: '' },
      });
    };
  }, [dispatch]);

  return (
    <ManageRoutesSpy>
      <Router history={history}>
        <RouteCapture>
          <Routes>
            <Route path="/">
              <CasesContext owner={[APP_ID]} permissions={userCasesPermissions}>
                <HomePage>{children}</HomePage>
              </CasesContext>
            </Route>
            <Route>
              <NotFoundPage />
            </Route>
          </Routes>
        </RouteCapture>
      </Router>
    </ManageRoutesSpy>
  );
};

export const PageRouter = memo(PageRouterComponent);
