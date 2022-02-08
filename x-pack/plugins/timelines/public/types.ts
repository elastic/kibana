/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ReactElement } from 'react';
import type { SensorAPI } from 'react-beautiful-dnd';
import { Store } from 'redux';
import { EuiDataGridCellValueElementProps } from '@elastic/eui';
import type { Filter } from '@kbn/es-query';
import type { FilterManager, DataPublicPluginStart } from '../../../../src/plugins/data/public';
import { Ecs } from '../common/ecs';
import { BrowserFields, TimelineNonEcsData } from '../common/search_strategy';
import { ColumnHeaderOptions } from '../common/types/timeline/columns';
import { CoreStart } from '../../../../src/core/public';
import { CasesUiStart } from '../../cases/public';
import type {
  LastUpdatedAtProps,
  LoadingPanelProps,
  FieldBrowserProps,
  UseDraggableKeyboardWrapper,
  UseDraggableKeyboardWrapperProps,
} from './components';
export type { SortDirection } from '../common/types';
import type { TGridIntegratedProps } from './components/t_grid/integrated';
import type { TGridStandaloneProps } from './components/t_grid/standalone';
import type { UseAddToTimelineProps, UseAddToTimeline } from './hooks/use_add_to_timeline';
import { HoverActionsConfig } from './components/hover_actions/index';
import type { AddToCaseActionProps } from './components/actions/timeline/cases/add_to_case_action';
import { RowRenderer } from '../common/types';
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

/** The following props are provided to the function called by `renderCellValue` */
export type CellValueElementProps = EuiDataGridCellValueElementProps & {
  asPlainText?: boolean;
  browserFields?: BrowserFields;
  data: TimelineNonEcsData[];
  ecsData?: Ecs;
  eventId: string; // _id
  globalFilters?: Filter[];
  filterManager?: FilterManager;
  header: ColumnHeaderOptions;
  isDraggable: boolean;
  isTimeline?: boolean; // Default cell renderer is used for both the alert table and timeline. This allows us to cheaply separate concerns
  linkValues: string[] | undefined;
  rowRenderers?: RowRenderer[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setFlyoutAlert?: (data: any) => void;
  timelineId: string;
  truncate?: boolean;
};
