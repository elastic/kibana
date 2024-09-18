/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCurrentRoute } from '@kbn/typed-react-router-config';
import { useContext, useEffect, useRef } from 'react';
import { castArray } from 'lodash';
import { Breadcrumb, BreadcrumbsContext } from './context';
import { useKibanaEnvironmentContext } from '../kibana_environment_context/use_kibana_environment_context';

export function useBreadcrumb(
  callback: () => Breadcrumb | Breadcrumb[],
  fnDeps: any[],
  options?: { omitRootOnServerless?: boolean; omitOnServerless?: boolean }
) {
  const { isServerlessEnv } = useKibanaEnvironmentContext();
  const { omitRootOnServerless = false, omitOnServerless = false } = options || {};

  const api = useContext(BreadcrumbsContext);

  if (!api) {
    throw new Error('Missing Breadcrumb API in context');
  }

  const { match } = useCurrentRoute();

  const matchedRoute = useRef(match?.route);

  useEffect(() => {
    if (isServerlessEnv && omitOnServerless) {
      return;
    }

    if (matchedRoute.current && matchedRoute.current !== match?.route) {
      api.unset(matchedRoute.current);
    }

    matchedRoute.current = match?.route;

    if (matchedRoute.current) {
      const breadcrumbs = castArray(callback());

      api.set(
        matchedRoute.current,
        isServerlessEnv && omitRootOnServerless && breadcrumbs.length >= 1
          ? breadcrumbs.slice(1)
          : breadcrumbs
      );
    }

    return () => {
      if (matchedRoute.current) {
        api.unset(matchedRoute.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match, ...fnDeps]);
}
