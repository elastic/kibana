/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Careful of exporting anything from this file as any file(s) you export here will cause your page bundle size to increase.
// If you're using functions/types/etc... internally or within integration tests it's best to import directly from their paths
// than expose the functions/types/etc... here. You should _only_ expose functions/types/etc... that need to be shared with other plugins here.

// When you do have to add things here you might want to consider creating a package to share with
// other plugins instead as packages are easier to break down and you do not have to carry the cost of extra plugin weight on
// first download since the other plugins/areas of your code can directly pull from the package in their async imports.
// See: https://docs.elastic.dev/kibana-dev-docs/key-concepts/platform-intro#public-plugin-api

export { DELETED_SECURITY_SOLUTION_DATA_VIEW } from './constants';

export type {
  ActionProps,
  AlertWorkflowStatus,
  CellValueElementProps,
  ColumnId,
  ColumnRenderer,
  ColumnHeaderType,
  ColumnHeaderOptions,
  ControlColumnProps,
  DataProvidersAnd,
  DataProvider,
  FieldBrowserOptions,
  GenericActionRowCellRenderProps,
  HeaderActionProps,
  HeaderCellRender,
  QueryOperator,
  QueryMatch,
  RowCellRender,
  RowRenderer,
  SetEventsDeleted,
  SetEventsLoading,
} from './types';

export { IS_OPERATOR, EXISTS_OPERATOR, DataProviderType, TimelineId } from './types';

export type {
  BeatFields,
  BrowserField,
  BrowserFields,
  CursorType,
  DocValueFields,
  EqlOptionsData,
  EqlOptionsSelected,
  FieldsEqlOptions,
  FieldInfo,
  IndexField,
  IndexFieldsStrategyRequest,
  IndexFieldsStrategyResponse,
  LastTimeDetails,
  TimelineNonEcsData,
  Inspect,
  SortField,
  TimerangeInput,
  TimelineEdges,
  TimelineItem,
  TimelineEventsAllStrategyResponse,
  TimelineEventsAllRequestOptions,
  TimelineEventsDetailsItem,
  TimelineEventsDetailsStrategyResponse,
  TimelineEventsDetailsRequestOptions,
  TimelineEventsLastEventTimeStrategyResponse,
  TimelineEventsLastEventTimeRequestOptions,
  TimelineEqlRequestOptions,
  TimelineEqlResponse,
  TimelineKpiStrategyRequest,
  TimelineKpiStrategyResponse,
  TotalValue,
  PaginationInputPaginated,
} from './search_strategy';

export {
  Direction,
  EntityType,
  LastEventIndexKey,
  EMPTY_BROWSER_FIELDS,
  EMPTY_DOCVALUE_FIELD,
  EMPTY_INDEX_FIELDS,
} from './search_strategy';
