/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { RouteProps, RouteComponentProps } from 'react-router-dom';
import { Redirect } from 'react-router-dom';
import { ALERTS_PATH, DETECTIONS_PATH } from '../../common/constants';
import { PluginTemplateWrapper } from '../common/components/plugin_template_wrapper';
import { Alerts } from './pages/alerts';

const AlertsRoutes = () => (
  <PluginTemplateWrapper>
    <Alerts />
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
