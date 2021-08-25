/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeOf, PathsOf, useParams } from '@kbn/typed-react-router-config';
import { ApmRoutes } from '../components/routing/apm_route_config';

export function useApmParams<TPath extends PathsOf<ApmRoutes>>(
  path: TPath,
  optional: true
): TypeOf<ApmRoutes, TPath> | undefined;

export function useApmParams<TPath extends PathsOf<ApmRoutes>>(
  path: TPath
): TypeOf<ApmRoutes, TPath>;

export function useApmParams<
  TPath1 extends PathsOf<ApmRoutes>,
  TPath2 extends PathsOf<ApmRoutes>
>(
  path1: TPath1,
  path2: TPath2
): TypeOf<ApmRoutes, TPath1> | TypeOf<ApmRoutes, TPath2>;

export function useApmParams<
  TPath1 extends PathsOf<ApmRoutes>,
  TPath2 extends PathsOf<ApmRoutes>,
  TPath3 extends PathsOf<ApmRoutes>
>(
  path1: TPath1,
  path2: TPath2,
  path3: TPath3
):
  | TypeOf<ApmRoutes, TPath1>
  | TypeOf<ApmRoutes, TPath2>
  | TypeOf<ApmRoutes, TPath3>;

export function useApmParams(
  ...args: any[]
): TypeOf<ApmRoutes, PathsOf<ApmRoutes>> | undefined {
  return useParams(...args);
}
