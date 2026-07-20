/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useLocation, Redirect } from 'react-router-dom';
import type { Location } from 'history';
import qs from 'query-string';
import React from 'react';
import usePrevious from 'react-use/lib/usePrevious';
import { useDefaultEnvironment } from '../../../../hooks/use_default_environment';

// Environment to restore when a bare `/services` visit immediately follows a
// service-detail page (the side-nav jump drops the query string).
function getRestorableEnvironment(location: Location | undefined): string | undefined {
  if (!location) {
    return undefined;
  }
  const normalizedPathname = location.pathname.replace(/\/$/, '');
  if (!normalizedPathname.startsWith('/services/')) {
    return undefined;
  }
  const environment = qs.parse(location.search).environment;
  return typeof environment === 'string' ? environment : undefined;
}

export function RedirectWithRememberedEnvironment({ children }: { children: React.ReactElement }) {
  const location = useLocation();
  const previousLocation = usePrevious(location);
  const defaultServiceEnvironment = useDefaultEnvironment();

  const query = qs.parse(location.search);
  const normalizedPathname = location.pathname.replace(/\/$/, '');
  const isServiceInventory = normalizedPathname === '/services';

  if ('environment' in query) {
    return children;
  }

  if (isServiceInventory) {
    const rememberedEnvironment = getRestorableEnvironment(previousLocation);
    return (
      <Redirect
        to={qs.stringifyUrl({
          url: location.pathname,
          query: {
            ...query,
            environment: rememberedEnvironment ?? defaultServiceEnvironment,
          },
        })}
      />
    );
  }

  return children;
}
