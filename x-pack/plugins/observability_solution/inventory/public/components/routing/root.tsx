/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';
import React from 'react';
import { RouteRenderer, RouterProvider } from '@kbn/typed-react-router-config';
import { HeaderMenuPortal } from '@kbn/observability-shared-plugin/public';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { InventoryContextProvider } from '../inventory_context_provider';
import { InventoryKibanaContext, useKibana } from '../../hooks/use_kibana';
import { inventoryRouter } from '../../routes/config';
import { HeaderActionMenuItems } from './header_action_menu';

export function AppRoot({ inventoryContext }: { inventoryContext: InventoryKibanaContext }) {
  const { core, appMountParameters } = inventoryContext;
  const { history } = appMountParameters;

  return (
    <InventoryContextProvider context={inventoryContext}>
      <RedirectAppLinks coreStart={core}>
        <core.i18n.Context>
          <RouterProvider history={history} router={inventoryRouter}>
            <RouteRenderer />
            <InventoryHeaderActionMenu />
          </RouterProvider>
        </core.i18n.Context>
      </RedirectAppLinks>
    </InventoryContextProvider>
  );
}

export function InventoryHeaderActionMenu() {
  const {
    appMountParameters: { setHeaderActionMenu, theme$ },
  } = useKibana();

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
