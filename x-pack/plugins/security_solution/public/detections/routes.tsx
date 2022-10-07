/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingSpinner } from '@elastic/eui';
import React, { lazy, Suspense } from 'react';
import type { RouteProps, RouteComponentProps } from 'react-router-dom';
import { Redirect } from 'react-router-dom';
import { ALERTS_PATH, DETECTIONS_PATH } from '../../common/constants';
import { PluginTemplateWrapper } from '../common/components/plugin_template_wrapper';

const AlertsLazy: React.FC = lazy(() => import('./pages/alerts'));

const AlertsRoutes = () => (
  <PluginTemplateWrapper>
    <Suspense fallback={<EuiLoadingSpinner />}>
      <AlertsLazy />
    </Suspense>
  </PluginTemplateWrapper>
);

const DetectionsRedirects = ({ location }: RouteComponentProps) =>
  location.pathname === DETECTIONS_PATH ? (
    <Redirect to={{ ...location, pathname: ALERTS_PATH }} />
  ) : (
    <Redirect to={{ ...location, pathname: location.pathname.replace(DETECTIONS_PATH, '') }} />
  );

export const routes: RouteProps[] = [
  {
    path: DETECTIONS_PATH,
    render: DetectionsRedirects,
  },
  {
    path: ALERTS_PATH,
    component: AlertsRoutes,
  },
];
