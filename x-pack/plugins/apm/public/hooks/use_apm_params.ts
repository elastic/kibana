/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ValuesType } from 'utility-types';
import { TypeOf, PathsOf, useParams } from '@kbn/typed-react-router-config';
import { ApmRoutes } from '../components/routing/apm_route_config';

export function useMaybeApmParams<TPath extends PathsOf<ApmRoutes>>(
  path: TPath,
  optional: true
): TypeOf<ApmRoutes, TPath> | undefined {
  return useParams(path, optional);
}

export function useApmParams<TPath extends PathsOf<ApmRoutes>>(
  path: TPath
): TypeOf<ApmRoutes, TPath> {
  return useParams(path)!;
}

export function useAnyOfApmParams<TPaths extends Array<PathsOf<ApmRoutes>>>(
  ...paths: TPaths
): TypeOf<ApmRoutes, ValuesType<TPaths>> {
  return useParams(...paths)!;
}
