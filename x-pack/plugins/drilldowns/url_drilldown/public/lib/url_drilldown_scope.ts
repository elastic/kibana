/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
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
import type { UrlTemplateEditorVariable } from '../../../../../../src/plugins/kibana_react/public';

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

export function getEventVariableList(context: ActionFactoryContext): UrlTemplateEditorVariable[] {
  const [trigger] = context.triggers;

  switch (trigger) {
    case VALUE_CLICK_TRIGGER:
      return [
        {
          label: 'event.value',
          title: i18n.translate('xpack.urlDrilldown.click.event.value.title', {
            defaultMessage: 'Click value.',
          }),
          documentation: i18n.translate('xpack.urlDrilldown.click.event.key.documentation', {
            defaultMessage: 'Value behind clicked data point.',
          }),
        },
        {
          label: 'event.key',
          title: i18n.translate('xpack.urlDrilldown.click.event.value.title', {
            defaultMessage: 'Name of clicked field.',
          }),
          documentation: i18n.translate('xpack.urlDrilldown.click.event.value.documentation', {
            defaultMessage: 'Field name behind clicked data point.',
          }),
        },
        {
          label: 'event.negate',
          title: i18n.translate('xpack.urlDrilldown.click.event.negate.title', {
            defaultMessage: 'Whether the filter is negated.',
          }),
          documentation: i18n.translate('xpack.urlDrilldown.click.event.negate.documentation', {
            defaultMessage:
              'Boolean, indicating whether clicked data point resulted in negative filter.',
          }),
        },
        {
          label: 'event.points',
          title: i18n.translate('xpack.urlDrilldown.click.event.points.title', {
            defaultMessage: 'List of all clicked points.',
          }),
          documentation: i18n.translate('xpack.urlDrilldown.click.event.points.documentation', {
            defaultMessage:
              'Some visualizations have clickable points that emit more than one data point. Use list of data points in case a single value is insufficient.',
          }),
        },
      ];
    case ROW_CLICK_TRIGGER:
      return [
        {
          label: 'event.values',
          title: i18n.translate('xpack.urlDrilldown.row.event.values.title', {
            defaultMessage: 'List of row cell values.',
          }),
          documentation: i18n.translate('xpack.urlDrilldown.row.event.values.documentation', {
            defaultMessage:
              'An array of all cell values for the raw on which the action will execute.',
          }),
        },
        {
          label: 'event.keys',
          title: i18n.translate('xpack.urlDrilldown.row.event.keys.title', {
            defaultMessage: 'List of row cell fields.',
          }),
          documentation: i18n.translate('xpack.urlDrilldown.row.event.keys.documentation', {
            defaultMessage: 'An array of field names for each column.',
          }),
        },
        {
          label: 'event.columnNames',
          title: i18n.translate('xpack.urlDrilldown.row.event.columnNames.title', {
            defaultMessage: 'List of table column names.',
          }),
          documentation: i18n.translate('xpack.urlDrilldown.row.event.columnNames.documentation', {
            defaultMessage: 'An array of column names.',
          }),
        },
        {
          label: 'event.rowIndex',
          title: i18n.translate('xpack.urlDrilldown.row.event.rowIndex.title', {
            defaultMessage: 'Clicked row index.',
          }),
          documentation: i18n.translate('xpack.urlDrilldown.row.event.rowIndex.documentation', {
            defaultMessage: 'Number, representing the row that was clicked, starting from 0.',
          }),
        },
      ];
    case SELECT_RANGE_TRIGGER:
      return [
        {
          label: 'event.key',
          title: i18n.translate('xpack.urlDrilldown.range.event.key.title', {
            defaultMessage: 'Name of aggregation field.',
          }),
          documentation: i18n.translate('xpack.urlDrilldown.range.event.key.documentation', {
            defaultMessage: 'Aggregation field behind the selected range, if available.',
          }),
        },
        {
          label: 'event.from',
          title: i18n.translate('xpack.urlDrilldown.range.event.from.title', {
            defaultMessage: 'Range start value.',
          }),
          documentation: i18n.translate('xpack.urlDrilldown.range.event.from.documentation', {
            defaultMessage:
              '`from` value of the selected range. Depending on your data, could be either a date or number.',
          }),
        },
        {
          label: 'event.to',
          title: i18n.translate('xpack.urlDrilldown.range.event.to.title', {
            defaultMessage: 'Range end value.',
          }),
          documentation: i18n.translate('xpack.urlDrilldown.range.event.to.documentation', {
            defaultMessage:
              '`to` value of the selected range. Depending on your data, could be either a date or number.',
          }),
        },
      ];
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
