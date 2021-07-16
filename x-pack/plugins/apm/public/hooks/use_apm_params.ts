/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OutputOf, PathsOf, useParams } from '@kbn/typed-react-router-config';
import { ApmRoutes } from '../components/routing/apm_route_config';

export function useApmParams<TPath extends PathsOf<ApmRoutes>>(
  path: TPath
): OutputOf<ApmRoutes, TPath> {
  return useParams(path as never);
}
