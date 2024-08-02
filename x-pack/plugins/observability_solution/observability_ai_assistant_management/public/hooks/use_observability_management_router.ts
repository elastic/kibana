/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PathsOf, TypeAsArgs, TypeOf } from '@kbn/typed-react-router-config';
import { useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import {
  AIAssistantManagementObservabilityRouter,
  AIAssistantManagementObservabilityRoutes,
} from '../routes/config';
import { aIAssistantManagementObservabilityRouter } from '../routes/config';
import { useKibana } from './use_kibana';

interface StatefulObservabilityAIAssistantRouter extends AIAssistantManagementObservabilityRouter {
  push<T extends PathsOf<AIAssistantManagementObservabilityRoutes>>(
    path: T,
    ...params: TypeAsArgs<TypeOf<AIAssistantManagementObservabilityRoutes, T>>
  ): void;
  replace<T extends PathsOf<AIAssistantManagementObservabilityRoutes>>(
    path: T,
    ...params: TypeAsArgs<TypeOf<AIAssistantManagementObservabilityRoutes, T>>
  ): void;
}

export function useObservabilityAIAssistantManagementRouter(): StatefulObservabilityAIAssistantRouter {
  const history = useHistory();

  const { http } = useKibana().services;

  const link = (...args: any[]) => {
    // @ts-ignore
    return aIAssistantManagementObservabilityRouter.link(...args);
  };

  return useMemo<StatefulObservabilityAIAssistantRouter>(
    () => ({
      ...aIAssistantManagementObservabilityRouter,
      push: (...args) => {
        const next = link(...args);

        history.push(next);
      },
      replace: (path, ...args) => {
        const next = link(path, ...args);
        history.replace(next);
      },
      link: (path, ...args) => {
        return http.basePath.prepend(
          '/app/management/observabilityAiAssistantManagement' + link(path, ...args)
        );
      },
    }),
    [http, history]
  );
}
