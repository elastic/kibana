/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { RouteProps } from 'react-router-dom';
import { CspPage } from '../common/navigation/types';
import * as pages from '../pages';

export const pageToComponentMapping: Record<CspPage, RouteProps['component']> = {
  findings: pages.Findings,
  dashboard: pages.ComplianceDashboard,
  benchmarks: pages.Benchmarks,
  rules: pages.Rules,
};
