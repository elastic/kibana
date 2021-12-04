/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TimelinesPlugin } from './plugin';

export {
  upsertColumn,
  applyDeltaToColumnWidth,
  updateColumnOrder,
  updateColumnWidth,
  toggleDetailPanel,
  removeColumn,
  updateIsLoading,
  updateColumns,
  updateItemsPerPage,
  updateItemsPerPageOptions,
  updateSort,
  setSelected,
  clearSelected,
  setEventsLoading,
  clearEventsLoading,
  setEventsDeleted,
  clearEventsDeleted,
  initializeTGridSettings,
  setTGridSelectAll,
} from './store/t_grid/actions';

export { getManageTimelineById } from './store/t_grid/selectors';

export { tGridReducer } from './store/t_grid/reducer';
export type { TimelinesUIStart, TGridModelForTimeline, TimelineState } from './types';
export type { TGridType, SortDirection, State as TGridState, TGridModel } from './types';
export type { OnColumnFocused } from '../common/utils/accessibility';

export {
  ARIA_COLINDEX_ATTRIBUTE,
  ARIA_ROWINDEX_ATTRIBUTE,
  DATA_COLINDEX_ATTRIBUTE,
  DATA_ROWINDEX_ATTRIBUTE,
  FIRST_ARIA_INDEX,
  arrayIndexToAriaIndex,
  elementOrChildrenHasFocus,
  isArrowDownOrArrowUp,
  isArrowUp,
  isEscape,
  isTab,
  focusColumn,
  getFocusedAriaColindexCell,
  getFocusedDataColindexCell,
  getNotesContainerClassName,
  getRowRendererClassName,
  getTableSkipFocus,
  handleSkipFocus,
  onKeyDownFocusHandler,
  stopPropagationAndPreventDefault,
} from '../common/utils/accessibility';

export {
  addFieldToTimelineColumns,
  getTimelineIdFromColumnDroppableId,
} from './components/drag_and_drop/helpers';

export { getActionsColumnWidth } from './components/t_grid/body/column_headers/helpers';
export { DEFAULT_ACTION_BUTTON_WIDTH } from './components/t_grid/body/constants';
export { useStatusBulkActionItems } from './hooks/use_status_bulk_action_items';
export { getPageRowIndex } from '../common/utils/pagination';

// This exports static code and TypeScript types,
// as well as, Kibana Platform `plugin()` initializer.
export function plugin() {
  return new TimelinesPlugin();
}

export { StatefulEventContext } from './components/stateful_event_context';
export { TimelineContext } from './components/t_grid/shared';
