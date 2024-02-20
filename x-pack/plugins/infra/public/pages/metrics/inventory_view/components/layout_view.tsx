/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { InventoryView } from '../../../../../common/inventory_views';
import {
  InventoryPageCallbacks,
  InitializedInventoryPageState,
} from '../../../../observability_infra/inventory_page/state';
import { SnapshotNode } from '../../../../../common/http_api';
import { Layout } from './layout';

interface Props {
  inventoryPageState: InitializedInventoryPageState;
  inventoryPageCallbacks: InventoryPageCallbacks;
  reload: () => Promise<any>;
  interval: string;
  nodes: SnapshotNode[];
  loading: boolean;
}

export const LayoutView = ({ inventoryPageState, ...props }: Props) => {
  const currentView = useMemo(() => getSavedView(inventoryPageState), [inventoryPageState]);
  return <Layout currentView={currentView} {...props} inventoryPageState={inventoryPageState} />;
};

const getSavedView = (inventoryPageState: InitializedInventoryPageState): InventoryView => {
  return {
    id: inventoryPageState.context.savedViewId,
    attributes: {
      filterQuery: inventoryPageState.context.filter,
      name: (inventoryPageState.context.savedViewName ?? 'Default view') as any,
      autoReload: inventoryPageState.context.time.isAutoReloading,
      ...inventoryPageState.context.options,
    },
  };
};
