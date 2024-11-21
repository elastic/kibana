/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PathsOf, TypeAsArgs, TypeOf } from '@kbn/typed-react-router-config';
import { useMemo } from 'react';
import type { InventoryRouter, InventoryRoutes } from '../routes/config';
import { inventoryRouter } from '../routes/config';
import { useKibana } from './use_kibana';

interface StatefulInventoryRouter extends InventoryRouter {
  push<T extends PathsOf<InventoryRoutes>>(
    path: T,
    ...params: TypeAsArgs<TypeOf<InventoryRoutes, T>>
  ): void;
  replace<T extends PathsOf<InventoryRoutes>>(
    path: T,
    ...params: TypeAsArgs<TypeOf<InventoryRoutes, T>>
  ): void;
}

export function useInventoryRouter(): StatefulInventoryRouter {
  const {
    services: {
      http,
      application: { navigateToApp },
    },
  } = useKibana();

  const link = (...args: any[]) => {
    // @ts-expect-error
    return inventoryRouter.link(...args);
  };

  return useMemo<StatefulInventoryRouter>(
    () => ({
      ...inventoryRouter,
      push: (...args) => {
        const next = link(...args);
        navigateToApp('inventory', { path: next, replace: false });
      },
      replace: (path, ...args) => {
        const next = link(path, ...args);
        navigateToApp('inventory', { path: next, replace: true });
      },
      link: (path, ...args) => {
        return http.basePath.prepend('/app/inventory' + link(path, ...args));
      },
    }),
    [navigateToApp, http.basePath]
  );
}
