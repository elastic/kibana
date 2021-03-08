/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { SavedViewsToolbarControls } from '../../../../components/saved_views/toolbar_control';
import { useWaffleViewState } from '../hooks/use_waffle_view_state';

export const SavedViews = () => {
  const { viewState } = useWaffleViewState();
  return <SavedViewsToolbarControls viewState={viewState} />;
};
