/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useRouter } from '@kbn/typed-react-router-config/target/use_router';
import { ApmRouter } from '../components/routing/apm_route_config';
import { useApmPluginContext } from '../context/apm_plugin/use_apm_plugin_context';

export function useApmRouter(): ApmRouter {
  const router = useRouter() as ApmRouter;
  const { core } = useApmPluginContext();

  return {
    ...router,
    link: (...args) => {
      return core.http.basePath.prepend('/app/apm' + router.link(...args));
    },
  };
}
