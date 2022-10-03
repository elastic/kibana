/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import actionCreatorFactory from 'typescript-fsa';
import type { RowRendererId } from '@kbn/timelines-plugin/common/types';

const actionCreator = actionCreatorFactory('x-pack/security_solution/local/timeline');

export const setExcludedRowRendererIds = actionCreator<{
  id: string;
  excludedRowRendererIds: RowRendererId[];
}>('SET_DATA_TABLE_EXCLUDED_ROW_RENDERER_IDS');

export {
  applyDeltaToColumnWidth,
  clearEventsDeleted,
  clearEventsLoading,
  clearSelected,
  initializeTGridSettings,
  removeColumn,
  setEventsDeleted,
  setEventsLoading,
  setSelected,
  setTGridSelectAll,
  toggleDetailPanel,
  updateColumnOrder,
  updateColumns,
  updateColumnWidth,
  updateIsLoading,
  updateItemsPerPage,
  updateItemsPerPageOptions,
  updateSort,
  upsertColumn,
  updateTableGraphEventId,
  updateTableSessionViewConfig,
  createTGrid,
} from '@kbn/timelines-plugin/public';
