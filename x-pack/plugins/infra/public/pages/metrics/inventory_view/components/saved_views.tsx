/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { InventoryView } from '../../../../../common/inventory_views';
import { InitializedInventoryPageState } from '../../../../observability_infra/inventory_page/state';
import { useInventoryViews } from '../../../../hooks/use_inventory_views';
import { SavedViewsToolbarControls } from '../../../../components/saved_views/toolbar_control';

export const SavedViews = ({
  inventoryPageState,
}: {
  inventoryPageState: InitializedInventoryPageState;
}) => {
  const currentView = useMemo(() => getSavedView(inventoryPageState), [inventoryPageState]);

  const {
    views,
    isFetchingViews,
    isFetchingCurrentView,
    isCreatingView,
    isUpdatingView,
    createView,
    deleteViewById,
    fetchViews,
    updateViewById,
    switchViewById,
    setDefaultViewById,
  } = useInventoryViews();

  return (
    <SavedViewsToolbarControls
      currentView={currentView}
      views={views}
      isFetchingViews={isFetchingViews}
      isFetchingCurrentView={isFetchingCurrentView}
      isCreatingView={isCreatingView}
      isUpdatingView={isUpdatingView}
      onCreateView={createView}
      onDeleteView={deleteViewById}
      onUpdateView={updateViewById}
      onLoadViews={fetchViews}
      onSetDefaultView={setDefaultViewById}
      onSwitchView={switchViewById}
      viewState={inventoryPageState.context.options}
    />
  );
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
