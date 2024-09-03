/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useLayoutEffect } from 'react';
import { PathsOf } from '@kbn/typed-react-router-config';
import { InventoryRoutes } from '../../routes/config';
import { useInventoryRouter } from '../../hooks/use_inventory_router';
import { useInventoryParams } from '../../hooks/use_inventory_params';

export function RedirectTo({ path }: { path: PathsOf<InventoryRoutes> }) {
  const router = useInventoryRouter();
  const params = useInventoryParams('/*');
  useLayoutEffect(() => {
    router.replace(path, params);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <></>;
}
