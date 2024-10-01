/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PathsOf, TypeAsArgs, TypeOf } from '@kbn/typed-react-router-config';
import { useMemo } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { SearchAIAssistantRouter, SearchAIAssistantRoutes } from '../components/routes/config';
import { searchAIAssistantRouter } from '../components/routes/config';

interface StatefulSearchAIAssistantRouter extends SearchAIAssistantRouter {
  push<T extends PathsOf<SearchAIAssistantRoutes>>(
    path: T,
    ...params: TypeAsArgs<TypeOf<SearchAIAssistantRoutes, T>>
  ): void;
  replace<T extends PathsOf<SearchAIAssistantRoutes>>(
    path: T,
    ...params: TypeAsArgs<TypeOf<SearchAIAssistantRoutes, T>>
  ): void;
}

export function useSearchAIAssistantRouter(): StatefulSearchAIAssistantRouter {
  const {
    services: { http, application },
  } = useKibana();

  const link = (...args: any[]) => {
    // @ts-expect-error
    return searchAIAssistantRouter.link(...args);
  };

  return useMemo<StatefulSearchAIAssistantRouter>(
    () => ({
      ...searchAIAssistantRouter,
      push: (...args) => {
        const next = link(...args);
        application?.navigateToApp('searchAssistant', { path: next, replace: false });
      },
      replace: (path, ...args) => {
        const next = link(path, ...args);
        application?.navigateToApp('searchAssistant', { path: next, replace: true });
      },
      link: (path, ...args) => {
        return http?.basePath.prepend('/app/searchAssistant' + link(path, ...args)) || '';
      },
    }),
    [application, http]
  );
}
