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
  IEmbeddable,
  isRangeSelectTriggerContext,
  isValueClickTriggerContext,
  isContextMenuTriggerContext,
  RangeSelectContext,
  ValueClickContext,
} from '../../../../../../src/plugins/embeddable/public';
import type { ActionContext, ActionFactoryContext, UrlTrigger } from './url_drilldown';
import {
  SELECT_RANGE_TRIGGER,
  VALUE_CLICK_TRIGGER,
} from '../../../../../../src/plugins/ui_actions/public';

type ContextScopeInput = ActionContext | ActionFactoryContext;

/**
 * Part of context scope extracted from an embeddable
 * Expose on the scope as: `{{context.panel.id}}`, `{{context.panel.filters.[0]}}`
 */
interface EmbeddableUrlDrilldownContextScope {
  id: string;
  title?: string;
  query?: Query;
  filters?: Filter[];
  timeRange?: TimeRange;
  savedObjectId?: string;
  /**
   * In case panel supports only 1 index patterns
   */
  indexPatternId?: string;
  /**
   * In case panel supports more then 1 index patterns
   */
  indexPatternIds?: string[];
}

/**
 * Url drilldown context scope
 * `{{context.$}}`
 */
interface UrlDrilldownContextScope {
  panel?: EmbeddableUrlDrilldownContextScope;
}

export function getContextScope(contextScopeInput: ContextScopeInput): UrlDrilldownContextScope {
  function hasEmbeddable(val: unknown): val is { embeddable: IEmbeddable } {
    if (val && typeof val === 'object' && 'embeddable' in val) return true;
    return false;
  }
  if (!hasEmbeddable(contextScopeInput))
    throw new Error(
      "UrlDrilldown [getContextScope] can't build scope because embeddable object is missing in context"
    );

  const embeddable = contextScopeInput.embeddable;
  const input = embeddable.getInput();
  const output = embeddable.getOutput();
  function hasSavedObjectId(obj: Record<string, any>): obj is { savedObjectId: string } {
    return 'savedObjectId' in obj && typeof obj.savedObjectId === 'string';
  }
  function getIndexPatternIds(): string[] {
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
  const indexPatternsIds = getIndexPatternIds();
  return {
    panel: cleanEmptyKeys({
      id: input.id,
      title: output.title ?? input.title,
      savedObjectId:
        output.savedObjectId ?? (hasSavedObjectId(input) ? input.savedObjectId : undefined),
      query: input.query,
      timeRange: input.timeRange,
      filters: input.filters,
      indexPatternIds: indexPatternsIds.length > 1 ? indexPatternsIds : undefined,
      indexPatternId: indexPatternsIds.length === 1 ? indexPatternsIds[0] : undefined,
    }),
  };
}

/**
 * URL drilldown event scope,
 * available as {{event.$}}
 */
export type UrlDrilldownEventScope =
  | ValueClickTriggerEventScope
  | RangeSelectTriggerEventScope
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

export type ContextMenuTriggerEventScope = object;

export function getEventScope(eventScopeInput: EventScopeInput): UrlDrilldownEventScope {
  if (isRangeSelectTriggerContext(eventScopeInput)) {
    return getEventScopeFromRangeSelectTriggerContext(eventScopeInput);
  } else if (isValueClickTriggerContext(eventScopeInput)) {
    return getEventScopeFromValueClickTriggerContext(eventScopeInput);
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
  return cleanEmptyKeys({
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

  return cleanEmptyKeys({
    key: points[0]?.key,
    value: points[0]?.value,
    negate,
    points,
  });
}

/**
 * @remarks
 * Difference between `event` and `context` variables, is that real `context` variables are available during drilldown creation (e.g. embeddable panel)
 * `event` variables are mapped from trigger context. Since there is no trigger context during drilldown creation, we have to provide some _mock_ variables for validating and previewing the URL
 */
export function getMockEventScope([trigger]: UrlTrigger[]): UrlDrilldownEventScope {
  if (trigger === SELECT_RANGE_TRIGGER) {
    return {
      key: 'event.key',
      from: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 minutes ago
      to: new Date().toISOString(),
    };
  }

  if (trigger === VALUE_CLICK_TRIGGER) {
    // number of mock points to generate
    // should be larger or equal of any possible data points length emitted by VALUE_CLICK_TRIGGER
    const nPoints = 4;
    const points = new Array(nPoints).fill(0).map((_, index) => ({
      key: `event.points.${index}.key`,
      value: `event.points.${index}.value`,
    }));
    return {
      key: `event.key`,
      value: `event.value`,
      negate: false,
      points,
    };
  }

  return {};
}

type Primitive = string | number | boolean | null;
function toPrimitiveOrUndefined(v: unknown): Primitive | undefined {
  if (typeof v === 'number' || typeof v === 'boolean' || typeof v === 'string' || v === null)
    return v;
  if (typeof v === 'object' && v instanceof Date) return v.toISOString();
  if (typeof v === 'undefined') return undefined;
  return String(v);
}

function cleanEmptyKeys<T extends Record<string, any>>(obj: T): T {
  Object.keys(obj).forEach((key) => {
    if (obj[key] === undefined) {
      delete obj[key];
    }
  });
  return obj;
}
