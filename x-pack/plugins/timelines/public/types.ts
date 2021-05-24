/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ReactElement } from 'react';
import { Store } from 'redux';
import { TGridIntegratedProps } from './components/t_grid/integrated';
import { tGridActions } from './store/t_grid';
import { tGridReducer } from './store/t_grid/reducer';
import { TimelineState } from './store/t_grid/types';
export * from './store/t_grid';
export interface TimelinesPluginSetup {
  getTGrid: (props: TGridProps) => ReactElement<TGridProps>;
  getTimelineStore?: () => ReduxDeps;
  getCreatedTgridStore?: (
    type: 'standalone' | 'embedded'
  ) => ReduxDeps | ((type: 'standalone' | 'embedded') => Store);
}
export interface ReduxDeps {
  actions: typeof tGridActions;
  reducer: typeof tGridReducer;
  initialState: TimelineState;
}
export interface TGridProps extends TGridIntegratedProps {
  type: 'standalone' | 'embedded';
}
