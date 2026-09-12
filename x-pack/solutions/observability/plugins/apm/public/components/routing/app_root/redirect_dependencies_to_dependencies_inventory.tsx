/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useLocation, Redirect } from 'react-router-dom';
import qs from 'query-string';
import React from 'react';

export function RedirectDependenciesToDependenciesInventory({
  children,
}: {
  children: React.ReactElement;
}) {
  const location = useLocation();

  const query = qs.parse(location.search);

  const normalizedPathname = location.pathname.replace(/\/$/, '');

  // `/dependencies/*` detail routes require `dependencyName` (inherited from the
  // `/dependencies` parent); without it they crash on params validation, so fall
  // back to the inventory. The inventory itself does not require it.
  const isDependencyDetailRoute =
    normalizedPathname === '/dependencies' ||
    (normalizedPathname.startsWith('/dependencies/') &&
      normalizedPathname !== '/dependencies/inventory');

  if (isDependencyDetailRoute && typeof query?.dependencyName !== 'string') {
    return (
      <Redirect
        to={qs.stringifyUrl({
          url: '/dependencies/inventory',
          query,
        })}
      />
    );
  }

  return children;
}
