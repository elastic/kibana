/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { RouteProps } from 'react-router-dom';
import { useKibana } from '../common/lib/kibana';

const Routes = () => <RedirectToCSP />;

export const routes: RouteProps[] = [{ path: '/csp', render: Routes }];

const RedirectToCSP = () => {
  const { navigateToApp } = useKibana().services?.application;
  React.useEffect(() => {
    navigateToApp('csp_root');
  }, [navigateToApp]);

  return null;
};
