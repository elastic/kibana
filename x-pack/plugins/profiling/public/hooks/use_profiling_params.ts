/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { PathsOf, TypeOf, useParams } from '@kbn/typed-react-router-config';
import { ValuesType } from 'utility-types';
import { ProfilingRoutes } from '../routing';

export function useProfilingParams<T extends PathsOf<ProfilingRoutes>>(
  path: T,
  ...args: any[]
): TypeOf<ProfilingRoutes, T> {
  return useParams(path, ...args) as TypeOf<ProfilingRoutes, T>;
}

export function useAnyOfProfilingParams<TPaths extends Array<PathsOf<ProfilingRoutes>>>(
  ...paths: TPaths
): TypeOf<ProfilingRoutes, ValuesType<TPaths>> {
  return useParams(...paths)! as TypeOf<ProfilingRoutes, ValuesType<TPaths>>;
}
