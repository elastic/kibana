/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { SavedViewsToolbarControls } from '../../../../components/saved_views/toolbar_control';
import { inventoryViewSavedObjectType } from '../../../../../common/saved_objects/inventory_view';
import { useWaffleViewState } from '../hooks/use_waffle_view_state';

export const SavedViews = () => {
  const { viewState, defaultViewState, onViewChange } = useWaffleViewState();
  return (
    <SavedViewsToolbarControls
      defaultViewState={defaultViewState}
      viewState={viewState}
      onViewChange={onViewChange}
      viewType={inventoryViewSavedObjectType}
    />
  );
};
