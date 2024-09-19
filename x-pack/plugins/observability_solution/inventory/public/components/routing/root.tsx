/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';
import React from 'react';
import { type AppMountParameters, type CoreStart } from '@kbn/core/public';
import { RouteRenderer, RouterProvider } from '@kbn/typed-react-router-config';
import { InventoryContextProvider } from '../inventory_context_provider';
import { inventoryRouter } from '../../routes/config';
import { InventoryStartDependencies } from '../../types';
import { InventoryServices } from '../../services/types';

export function AppRoot({
  coreStart,
  pluginsStart,
  services,
  appMountParameters,
}: {
  coreStart: CoreStart;
  pluginsStart: InventoryStartDependencies;
  services: InventoryServices;
} & { appMountParameters: AppMountParameters }) {
  const { history } = appMountParameters;

  const context = {
    ...coreStart,
    ...pluginsStart,
    ...services,
  };

  return (
    <InventoryContextProvider context={context}>
      <RedirectAppLinks coreStart={coreStart}>
        <coreStart.i18n.Context>
          <RouterProvider history={history} router={inventoryRouter}>
            <RouteRenderer />
          </RouterProvider>
        </coreStart.i18n.Context>
      </RedirectAppLinks>
    </InventoryContextProvider>
  );
}
