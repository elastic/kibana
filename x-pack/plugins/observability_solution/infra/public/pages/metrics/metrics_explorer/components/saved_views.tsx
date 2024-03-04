/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useMetricsExplorerViews } from '../../../../hooks/use_metrics_explorer_views';
import { SavedViewsToolbarControls } from '../../../../components/saved_views/toolbar_control';
import { MetricsExplorerViewState } from '../hooks/use_metric_explorer_state';

interface Props {
  viewState: MetricsExplorerViewState;
}

export const SavedViews = ({ viewState }: Props) => {
  const {
    currentView,
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
  } = useMetricsExplorerViews();

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
      viewState={viewState}
    />
  );
};
