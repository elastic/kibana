/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PathsOf, TypeAsArgs, TypeOf } from '@kbn/typed-react-router-config';
import { useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import { observabilityRouter, ObservabilityRouter, ObservabilityRoutes } from '../route_config';
import { useKibana } from './use_kibana';

export interface StatefulObservabilityRouter extends ObservabilityRouter {
  push<T extends PathsOf<ObservabilityRoutes>>(
    path: T,
    ...params: TypeAsArgs<TypeOf<ObservabilityRoutes, T>>
  ): void;
  replace<T extends PathsOf<ObservabilityRoutes>>(
    path: T,
    ...params: TypeAsArgs<TypeOf<ObservabilityRoutes, T>>
  ): void;
}

export function useObservabilityRouter(): StatefulObservabilityRouter {
  const history = useHistory();
  const {
    services: { http },
  } = useKibana();

  const link = (...args: any[]) => {
    // @ts-expect-error
    return observabilityRouter.link(...args);
  };

  return useMemo<StatefulObservabilityRouter>(
    () => ({
      ...observabilityRouter,
      push: (...args) => {
        const next = link(...args);
        history.push(next);
      },
      replace: (path, ...args) => {
        const next = link(path, ...args);
        history.replace(next);
      },
      link: (path, ...args) => {
        return http.basePath.prepend('/app/observability_new' + link(path, ...args));
      },
    }),
    [history, http.basePath]
  );
}
