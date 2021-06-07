/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ReactElement } from 'react';
import type { SensorAPI } from 'react-beautiful-dnd';
import { Store } from 'redux';
import type {
  LastUpdatedAtProps,
  LoadingPanelProps,
  UseDraggableKeyboardWrapper,
  UseDraggableKeyboardWrapperProps,
} from './components';
import type { TGridIntegratedProps } from './components/t_grid/integrated';
import type { TGridStandaloneProps } from './components/t_grid/standalone';
import type { UseAddToTimelineProps, UseAddToTimeline } from './hooks/use_add_to_timeline';

export * from './store/t_grid';
export interface TimelinesUIStart {
  getTGrid: <T extends TGridType = 'embedded'>(
    props: GetTGridProps<T>
  ) => ReactElement<GetTGridProps<T>>;
  getTGridReducer: () => any;
  getLoadingPanel: (props: LoadingPanelProps) => ReactElement<LoadingPanelProps>;
  getLastUpdated: (props: LastUpdatedAtProps) => ReactElement<LastUpdatedAtProps>;
  getUseAddToTimeline: () => (props: UseAddToTimelineProps) => UseAddToTimeline;
  getUseAddToTimelineSensor: () => (api: SensorAPI) => void;
  getUseDraggableKeyboardWrapper: () => (
    props: UseDraggableKeyboardWrapperProps
  ) => UseDraggableKeyboardWrapper;
  setTGridEmbeddedStore: (store: Store) => void;
}

interface TGridStandaloneCompProps extends TGridStandaloneProps {
  type: 'standalone';
}

interface TGridIntegratedCompProps extends TGridIntegratedProps {
  type: 'embedded';
}

export type TGridType = 'standalone' | 'embedded';
export type GetTGridProps<T extends TGridType> = T extends 'standalone'
  ? TGridStandaloneCompProps
  : T extends 'embedded'
  ? TGridIntegratedCompProps
  : TGridIntegratedCompProps;

export type TGridProps = TGridStandaloneCompProps | TGridIntegratedCompProps;
