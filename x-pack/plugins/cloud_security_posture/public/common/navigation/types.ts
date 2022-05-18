/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { RouteProps } from 'react-router-dom';

export interface CspNavigationItem {
  readonly name: string;
  readonly path: string;
  readonly disabled?: boolean;
  readonly exact?: RouteProps['exact'];
}

export type CspPage = 'dashboard' | 'findings' | 'benchmarks' | 'rules';
