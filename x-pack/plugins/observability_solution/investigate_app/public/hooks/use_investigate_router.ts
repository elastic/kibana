/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PathsOf, TypeAsArgs, TypeOf } from '@kbn/typed-react-router-config';
import { useMemo } from 'react';
import { InvestigateRouter, InvestigateRoutes } from '../routes/config';
import { investigateRouter } from '../routes/config';
import { useKibana } from './use_kibana';

interface StatefulInvestigateRouter extends InvestigateRouter {
  push<T extends PathsOf<InvestigateRoutes>>(
    path: T,
    ...params: TypeAsArgs<TypeOf<InvestigateRoutes, T>>
  ): void;
  replace<T extends PathsOf<InvestigateRoutes>>(
    path: T,
    ...params: TypeAsArgs<TypeOf<InvestigateRoutes, T>>
  ): void;
}

export function useInvestigateRouter(): StatefulInvestigateRouter {
  const {
    core: {
      http,
      application: { navigateToApp },
    },
  } = useKibana();

  const link = (...args: any[]) => {
    // @ts-expect-error
    return investigateRouter.link(...args);
  };

  return useMemo<StatefulInvestigateRouter>(
    () => ({
      ...investigateRouter,
      push: (...args) => {
        const next = link(...args);
        navigateToApp('investigations', { path: next, replace: false });
      },
      replace: (path, ...args) => {
        const next = link(path, ...args);
        navigateToApp('investigations', { path: next, replace: true });
      },
      link: (path, ...args) => {
        return http.basePath.prepend('/app/investigations' + link(path, ...args));
      },
    }),
    [navigateToApp, http.basePath]
  );
}
