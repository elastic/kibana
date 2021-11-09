/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useRouter } from '@kbn/typed-react-router-config';
import type { ApmRouter } from '../components/routing/apm_route_config';
import { useKibanaServicesContext } from '../context/kibana_services/use_kibana_services_context';

export function useApmRouter() {
  const router = useRouter();
  const { http } = useKibanaServicesContext();

  const link = (...args: any[]) => {
    // a little too much effort needed to satisfy TS here
    // @ts-ignore
    return http.basePath.prepend('/app/apm' + router.link(...args));
  };

  return {
    ...router,
    link,
  } as unknown as ApmRouter;
}
