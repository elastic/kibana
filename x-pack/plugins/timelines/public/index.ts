/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { PluginInitializerContext } from '../../../../src/core/public/plugins/plugin_context';
import { TimelinesPlugin } from './plugin';

export { Direction } from '../common/search_strategy/common';
export type {
  CursorType,
  DocValueFields,
  Inspect,
  PaginationInputPaginated,
  SortField,
  TimerangeInput,
  TotalValue,
} from '../common/search_strategy/common';
export {
  ARIA_COLINDEX_ATTRIBUTE,
  ARIA_ROWINDEX_ATTRIBUTE,
  arrayIndexToAriaIndex,
  DATA_COLINDEX_ATTRIBUTE,
  DATA_ROWINDEX_ATTRIBUTE,
  elementOrChildrenHasFocus,
  FIRST_ARIA_INDEX,
  focusColumn,
  getFocusedAriaColindexCell,
  getFocusedDataColindexCell,
  getNotesContainerClassName,
  getRowRendererClassName,
  getTableSkipFocus,
  handleSkipFocus,
  isArrowDownOrArrowUp,
  isArrowUp,
  isEscape,
  isTab,
  OnColumnFocused,
  onFocusReFocusDraggable,
  onKeyDownFocusHandler,
  skipFocusInContainerTo,
  stopPropagationAndPreventDefault,
} from '../common/utils/accessibility';
export {
  addFieldToTimelineColumns,
  getTimelineIdFromColumnDroppableId,
} from './components/drag_and_drop/helpers';
export { StatefulFieldsBrowser } from './components/t_grid/toolbar/fields_browser';
export { useStatusBulkActionItems } from './hooks/use_status_bulk_action_items';
export * as tGridActions from './store/t_grid/actions';
export { tGridReducer } from './store/t_grid/reducer';
export * as tGridSelectors from './store/t_grid/selectors';
export { SortDirection, TGridType } from './types';
export type { TGridModelForTimeline, TimelineState, TimelinesUIStart } from './types';
// This exports static code and TypeScript types,
// as well as, Kibana Platform `plugin()` initializer.
export function plugin(initializerContext: PluginInitializerContext) {
  return new TimelinesPlugin(initializerContext);
}
