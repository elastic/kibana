/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * This file contains all the logic for mapping from trigger's context and action factory context to variables for URL drilldown scope,
 * Please refer to ./README.md for explanation of different scope sources
 */

import type { Filter, Query, TimeRange } from '../../../../../../src/plugins/data/public';
import {
  isRangeSelectTriggerContext,
  isValueClickTriggerContext,
  isRowClickTriggerContext,
  isContextMenuTriggerContext,
  RangeSelectContext,
  SELECT_RANGE_TRIGGER,
  ValueClickContext,
  VALUE_CLICK_TRIGGER,
  EmbeddableInput,
  EmbeddableOutput,
} from '../../../../../../src/plugins/embeddable/public';
import type {
  ActionContext,
  ActionFactoryContext,
  EmbeddableWithQueryInput,
} from './url_drilldown';
import {
  RowClickContext,
  ROW_CLICK_TRIGGER,
} from '../../../../../../src/plugins/ui_actions/public';

/**
 * Part of context scope extracted from an embeddable
 * Expose on the scope as: `{{context.panel.id}}`, `{{context.panel.filters.[0]}}`
 */
interface EmbeddableUrlDrilldownContextScope extends EmbeddableInput {
  /**
   * ID of the embeddable panel.
   */
  id: string;

  /**
   * Title of the embeddable panel.
   */
  title?: string;

  /**
   * In case panel supports only 1 index pattern.
   */
  indexPatternId?: string;

  /**
   * In case panel supports more then 1 index pattern.
   */
  indexPatternIds?: string[];

  query?: Query;
  filters?: Filter[];
  timeRange?: TimeRange;
  savedObjectId?: string;
}

export function getPanelVariables(contextScopeInput: unknown): EmbeddableUrlDrilldownContextScope {
  function hasEmbeddable(val: unknown): val is { embeddable: EmbeddableWithQueryInput } {
    if (val && typeof val === 'object' && 'embeddable' in val) return true;
    return false;
  }
  if (!hasEmbeddable(contextScopeInput))
    throw new Error(
      "UrlDrilldown [getContextScope] can't build scope because embeddable object is missing in context"
    );
  const embeddable = contextScopeInput.embeddable;

  return getEmbeddableVariables(embeddable);
}

function hasSavedObjectId(obj: Record<string, any>): obj is { savedObjectId: string } {
  return 'savedObjectId' in obj && typeof obj.savedObjectId === 'string';
}

/**
 * @todo Same functionality is implemented in x-pack/plugins/discover_enhanced/public/actions/explore_data/shared.ts,
 *       combine both implementations into a common approach.
 */
function getIndexPatternIds(output: EmbeddableOutput): string[] {
  function hasIndexPatterns(
    _output: Record<string, any>
  ): _output is { indexPatterns: Array<{ id?: string }> } {
    return (
      'indexPatterns' in _output &&
      Array.isArray(_output.indexPatterns) &&
      _output.indexPatterns.length > 0
    );
  }
  return hasIndexPatterns(output)
    ? (output.indexPatterns.map((ip) => ip.id).filter(Boolean) as string[])
    : [];
}

export function getEmbeddableVariables(
  embeddable: EmbeddableWithQueryInput
): EmbeddableUrlDrilldownContextScope {
  const input = embeddable.getInput();
  const output = embeddable.getOutput();
  const indexPatternsIds = getIndexPatternIds(output);

  return deleteUndefinedKeys({
    id: input.id,
    title: output.title ?? input.title,
    savedObjectId:
      output.savedObjectId ?? (hasSavedObjectId(input) ? input.savedObjectId : undefined),
    query: input.query,
    timeRange: input.timeRange,
    filters: input.filters,
    indexPatternIds: indexPatternsIds.length > 1 ? indexPatternsIds : undefined,
    indexPatternId: indexPatternsIds.length === 1 ? indexPatternsIds[0] : undefined,
  });
}

/**
 * URL drilldown event scope,
 * available as {{event.$}}
 */
export type UrlDrilldownEventScope =
  | ValueClickTriggerEventScope
  | RangeSelectTriggerEventScope
  | RowClickTriggerEventScope
  | ContextMenuTriggerEventScope;

export type EventScopeInput = ActionContext;
export interface ValueClickTriggerEventScope {
  key?: string;
  value: Primitive;
  negate: boolean;
  points: Array<{ key?: string; value: Primitive }>;
}
export interface RangeSelectTriggerEventScope {
  key: string;
  from?: string | number;
  to?: string | number;
}

export interface RowClickTriggerEventScope {
  rowIndex: number;
  values: Primitive[];
  keys: string[];
  columnNames: string[];
}
export type ContextMenuTriggerEventScope = object;

export function getEventScope(eventScopeInput: EventScopeInput): UrlDrilldownEventScope {
  if (isRangeSelectTriggerContext(eventScopeInput)) {
    return getEventScopeFromRangeSelectTriggerContext(eventScopeInput);
  } else if (isValueClickTriggerContext(eventScopeInput)) {
    return getEventScopeFromValueClickTriggerContext(eventScopeInput);
  } else if (isRowClickTriggerContext(eventScopeInput)) {
    return getEventScopeFromRowClickTriggerContext(eventScopeInput);
  } else if (isContextMenuTriggerContext(eventScopeInput)) {
    return {};
  } else {
    throw new Error("UrlDrilldown [getEventScope] can't build scope from not supported trigger");
  }
}

function getEventScopeFromRangeSelectTriggerContext(
  eventScopeInput: RangeSelectContext
): RangeSelectTriggerEventScope {
  const { table, column: columnIndex, range } = eventScopeInput.data;
  const column = table.columns[columnIndex];
  return deleteUndefinedKeys({
    key: toPrimitiveOrUndefined(column?.meta.field) as string,
    from: toPrimitiveOrUndefined(range[0]) as string | number | undefined,
    to: toPrimitiveOrUndefined(range[range.length - 1]) as string | number | undefined,
  });
}

function getEventScopeFromValueClickTriggerContext(
  eventScopeInput: ValueClickContext
): ValueClickTriggerEventScope {
  const negate = eventScopeInput.data.negate ?? false;
  const points = eventScopeInput.data.data.map(({ table, value, column: columnIndex }) => {
    const column = table.columns[columnIndex];
    return {
      value: toPrimitiveOrUndefined(value) as Primitive,
      key: column?.meta?.field,
    };
  });

  return deleteUndefinedKeys({
    key: points[0]?.key,
    value: points[0]?.value,
    negate,
    points,
  });
}

function getEventScopeFromRowClickTriggerContext(ctx: RowClickContext): RowClickTriggerEventScope {
  const { data } = ctx;
  const embeddable = ctx.embeddable as EmbeddableWithQueryInput;

  const { rowIndex } = data;
  const columns = data.columns || data.table.columns.map(({ id }) => id);
  const values: Primitive[] = [];
  const keys: string[] = [];
  const columnNames: string[] = [];
  const row = data.table.rows[rowIndex];

  for (const columnId of columns) {
    const column = data.table.columns.find(({ id }) => id === columnId);
    if (!column) {
      // This should never happe, but in case it does we log data necessary for debugging.
      // eslint-disable-next-line no-console
      console.error(data, embeddable ? `Embeddable [${embeddable.getTitle()}]` : null);
      throw new Error('Could not find a datatable column.');
    }
    values.push(row[columnId]);
    keys.push(column.meta.field || '');
    columnNames.push(column.name || column.meta.field || '');
  }

  const scope: RowClickTriggerEventScope = {
    rowIndex,
    values,
    keys,
    columnNames,
  };

  return scope;
}

export function getEventVariableList(context: ActionFactoryContext): string[] {
  const [trigger] = context.triggers;

  switch (trigger) {
    case SELECT_RANGE_TRIGGER:
      return ['event.key', 'event.from', 'event.to'];
    case VALUE_CLICK_TRIGGER:
      return ['event.key', 'event.value', 'event.negate', 'event.points'];
    case ROW_CLICK_TRIGGER:
      return ['event.rowIndex', 'event.values', 'event.keys', 'event.columnNames'];
  }

  return [];
}

type Primitive = string | number | boolean | null;
function toPrimitiveOrUndefined(v: unknown): Primitive | undefined {
  if (typeof v === 'number' || typeof v === 'boolean' || typeof v === 'string' || v === null)
    return v;
  if (typeof v === 'object' && v instanceof Date) return v.toISOString();
  if (typeof v === 'undefined') return undefined;
  return String(v);
}

function deleteUndefinedKeys<T extends Record<string, any>>(obj: T): T {
  Object.keys(obj).forEach((key) => {
    if (obj[key] === undefined) {
      delete obj[key];
    }
  });
  return obj;
}
