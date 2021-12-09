/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { RouteProps } from 'react-router-dom';
import * as pages from '../pages';
import { CSP_ROOT_PATH, CSP_FINDINGS_PATH, CSP_DASHBOARD_PATH } from '../common/constants';

export const routes: readonly RouteProps[] = [
  { path: CSP_FINDINGS_PATH, component: pages.Findings },
  { path: CSP_DASHBOARD_PATH, component: pages.ComplianceDashboard },
];
