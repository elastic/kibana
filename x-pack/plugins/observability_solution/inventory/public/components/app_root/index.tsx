/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { type AppMountParameters, type CoreStart } from '@kbn/core/public';
import { HeaderMenuPortal } from '@kbn/observability-shared-plugin/public';
import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';
import { RouteRenderer, RouterProvider } from '@kbn/typed-react-router-config';
import React from 'react';
import { InventoryContextProvider } from '../../context/inventory_context_provider';
import { InventorySearchBarContextProvider } from '../../context/inventory_search_bar_context_provider';
import { inventoryRouter } from '../../routes/config';
import { InventoryServices } from '../../services/types';
import { InventoryStartDependencies } from '../../types';
import { HeaderActionMenuItems } from './header_action_menu';
import { KibanaEnvironment } from '../../hooks/use_kibana';

export function AppRoot({
  coreStart,
  pluginsStart,
  services,
  appMountParameters,
  kibanaEnvironment,
}: {
  coreStart: CoreStart;
  pluginsStart: InventoryStartDependencies;
  services: InventoryServices;
  kibanaEnvironment: KibanaEnvironment;
} & { appMountParameters: AppMountParameters }) {
  const { history } = appMountParameters;

  const context = {
    ...coreStart,
    ...pluginsStart,
    ...services,
    kibanaEnvironment,
  };

  return (
    <InventoryContextProvider context={context}>
      <RedirectAppLinks coreStart={coreStart}>
        <InventorySearchBarContextProvider>
          <RouterProvider history={history} router={inventoryRouter as any}>
            <RouteRenderer />
            <InventoryHeaderActionMenu appMountParameters={appMountParameters} />
          </RouterProvider>
        </InventorySearchBarContextProvider>
      </RedirectAppLinks>
    </InventoryContextProvider>
  );
}

export function InventoryHeaderActionMenu({
  appMountParameters,
}: {
  appMountParameters: AppMountParameters;
}) {
  const { setHeaderActionMenu, theme$ } = appMountParameters;

  return (
    <HeaderMenuPortal setHeaderActionMenu={setHeaderActionMenu} theme$={theme$}>
      <EuiFlexGroup responsive={false} gutterSize="s">
        <EuiFlexItem>
          <HeaderActionMenuItems />
        </EuiFlexItem>
      </EuiFlexGroup>
    </HeaderMenuPortal>
  );
}
