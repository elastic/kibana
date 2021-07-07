/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  PathsOf,
  TypeAsArgs,
  TypeOf,
} from '@kbn/typed-react-router-config/target/types';
import { useRouter } from '@kbn/typed-react-router-config/target/use_router';
import { ApmRoutes } from '../components/routing/apm_route_config';
import { useApmPluginContext } from '../context/apm_plugin/use_apm_plugin_context';

export function useApmLink<TPath extends PathsOf<ApmRoutes>>(
  path: TPath,
  ...args: TypeAsArgs<TypeOf<ApmRoutes, TPath>>
): string {
  const router = useRouter<ApmRoutes>();

  const { core } = useApmPluginContext();

  return core.http.basePath.prepend('/app/apm' + router.link(path, ...args));
}
