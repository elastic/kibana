/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useLocation, Redirect } from 'react-router-dom';
import qs from 'query-string';
import React from 'react';
import { useDefaultEnvironment } from '../../../hooks/use_default_environment';

export function RedirectWithDefaultEnvironment({
  children,
}: {
  children: React.ReactElement;
}) {
  const location = useLocation();

  const query = qs.parse(location.search);

  const defaultServiceEnvironment = useDefaultEnvironment();

  if ('environment' in query) {
    return children;
  }

  const normalizedPathname = location.pathname.replace(/\/$/, '');
  if (normalizedPathname === '/services') {
    return (
      <Redirect
        to={qs.stringifyUrl({
          url: location.pathname,
          query: {
            ...query,
            environment: defaultServiceEnvironment,
          },
        })}
      />
    );
  }

  return children;
}
