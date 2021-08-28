/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ReactElement } from 'react';
import type { SensorAPI } from 'react-beautiful-dnd';
import type { Store } from 'redux';
import type { CoreStart } from '../../../../src/core/public/types';
import type { DataPublicPluginStart } from '../../../../src/plugins/data/public/types';
import type { CasesUiStart } from '../../cases/public/types';
import type { AddToCaseActionProps } from './components/actions/timeline/cases/add_to_case_action';
import type {
  UseDraggableKeyboardWrapper,
  UseDraggableKeyboardWrapperProps,
} from './components/drag_and_drop/draggable_keyboard_wrapper_hook';
import type { HoverActionsConfig } from './components/hover_actions';
import type { LastUpdatedAtProps } from './components/last_updated';
import type { LoadingPanelProps } from './components/loading';
import type { TGridIntegratedProps } from './components/t_grid/integrated';
import type { TGridStandaloneProps } from './components/t_grid/standalone';
import type { FieldBrowserProps } from './components/t_grid/toolbar/fields_browser/types';
import type { UseAddToTimeline, UseAddToTimelineProps } from './hooks/use_add_to_timeline';

export type { SortDirection } from '../common';
export * from './store/t_grid';
export interface TimelinesUIStart {
  getHoverActions: () => HoverActionsConfig;
  getTGrid: <T extends TGridType = 'embedded'>(
    props: GetTGridProps<T>
  ) => ReactElement<GetTGridProps<T>>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getTGridReducer: () => any;
  getLoadingPanel: (props: LoadingPanelProps) => ReactElement<LoadingPanelProps>;
  getLastUpdated: (props: LastUpdatedAtProps) => ReactElement<LastUpdatedAtProps>;
  getFieldBrowser: (props: FieldBrowserProps) => ReactElement<FieldBrowserProps>;
  getUseAddToTimeline: () => (props: UseAddToTimelineProps) => UseAddToTimeline;
  getUseAddToTimelineSensor: () => (api: SensorAPI) => void;
  getUseDraggableKeyboardWrapper: () => (
    props: UseDraggableKeyboardWrapperProps
  ) => UseDraggableKeyboardWrapper;
  setTGridEmbeddedStore: (store: Store) => void;
  getAddToCaseAction: (props: AddToCaseActionProps) => ReactElement<AddToCaseActionProps>;
  getAddToCasePopover: (props: AddToCaseActionProps) => ReactElement<AddToCaseActionProps>;
  getAddToExistingCaseButton: (props: AddToCaseActionProps) => ReactElement<AddToCaseActionProps>;
  getAddToNewCaseButton: (props: AddToCaseActionProps) => ReactElement<AddToCaseActionProps>;
}

export interface TimelinesStartPlugins {
  data: DataPublicPluginStart;
  cases: CasesUiStart;
}

export type TimelinesStartServices = CoreStart & TimelinesStartPlugins;
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
