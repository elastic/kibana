/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCurrentRoute } from '@kbn/typed-react-router-config/target/use_current_route';
import { useContext, useEffect, useRef } from 'react';
import { BreadcrumbsContext } from './context';

export function useBreadcrumb({
  title,
  href,
}: {
  title: string;
  href: string;
}) {
  const api = useContext(BreadcrumbsContext);

  if (!api) {
    throw new Error('Missing Breadcrumb API in context');
  }

  const { match } = useCurrentRoute();

  const matchedRoute = useRef(match?.route);

  if (matchedRoute.current && matchedRoute.current !== match?.route) {
    api.unset(matchedRoute.current);
  }

  matchedRoute.current = match?.route;

  console.log({
    current: matchedRoute.current,
    title,
    href,
  });

  if (matchedRoute.current) {
    api.set(matchedRoute.current, { title, href });
  }

  useEffect(() => {
    return () => {
      if (matchedRoute.current) {
        api.unset(matchedRoute.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
