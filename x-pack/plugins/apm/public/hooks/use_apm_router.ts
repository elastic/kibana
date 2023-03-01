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
  useRouter,
} from '@kbn/typed-react-router-config';
import { merge } from 'lodash';
import { useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import { DeepPartial } from 'utility-types';
import type {
  ApmRouter,
  ApmRoutes,
} from '../components/routing/apm_route_config';
import { useApmPluginContext } from '../context/apm_plugin/use_apm_plugin_context';

type StatefulApmRouter = ApmRouter & {
  push<TPath extends PathsOf<ApmRoutes>>(
    path: TPath,
    ...args: TypeAsArgs<DeepPartial<TypeOf<ApmRoutes, TPath, false>>>
  ): void;
  replace<TPath extends PathsOf<ApmRoutes>>(
    path: TPath,
    ...args: TypeAsArgs<DeepPartial<TypeOf<ApmRoutes, TPath, false>>>
  ): void;
};

export function useApmRouter() {
  const router = useRouter();
  const { core } = useApmPluginContext();
  const history = useHistory();

  return useMemo<StatefulApmRouter>(() => {
    const apmRouter = {
      ...router,
      link: (...args: [any]) =>
        core.http.basePath.prepend('/app/apm' + router.link(...args)),
    } as unknown as ApmRouter;

    function getLink(path: string, ...args: any[]): string {
      let params = router.getParams(path, history.location);

      if (args.length === 1) {
        params = merge({}, params, args[0]);
      }

      // @ts-expect-error
      const link = router.link(path, params);

      return link;
    }

    return {
      ...apmRouter,
      push<TPath extends PathsOf<ApmRoutes>>(
        path: TPath,
        ...args: TypeAsArgs<DeepPartial<TypeOf<ApmRoutes, TPath, false>>>
      ) {
        history.push(getLink(path, ...args));
      },
      replace<TPath extends PathsOf<ApmRoutes>>(
        path: TPath,
        ...args: TypeAsArgs<DeepPartial<TypeOf<ApmRoutes, TPath, false>>>
      ) {
        history.replace(getLink(path, ...args));
      },
    };
  }, [core.http.basePath, router, history]);
}
