/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { monaco } from '@kbn/monaco';
import {
  isRangeSelectTriggerContext,
  isValueClickTriggerContext,
  isRowClickTriggerContext,
  isContextMenuTriggerContext,
  RangeSelectContext,
  SELECT_RANGE_TRIGGER,
  ValueClickContext,
  VALUE_CLICK_TRIGGER,
} from '@kbn/embeddable-plugin/public';
import { RowClickContext, ROW_CLICK_TRIGGER } from '@kbn/ui-actions-plugin/public';
import type { UrlTemplateEditorVariable } from '@kbn/kibana-react-plugin/public';
import type {
  ActionContext,
  ActionFactoryContext,
  EmbeddableWithQueryInput,
} from '../url_drilldown';
import { deleteUndefinedKeys, toPrimitiveOrUndefined, Primitive } from './util';

/**
 * URL drilldown event scope, available as `{{event.*}}` Handlebars variables.
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

const getEventScopeFromRangeSelectTriggerContext = (
  eventScopeInput: RangeSelectContext
): RangeSelectTriggerEventScope => {
  const { table, column: columnIndex, range } = eventScopeInput.data;
  const column = table.columns[columnIndex];
  return deleteUndefinedKeys({
    key: toPrimitiveOrUndefined(column?.meta.field) as string,
    from: toPrimitiveOrUndefined(range[0]) as string | number | undefined,
    to: toPrimitiveOrUndefined(range[range.length - 1]) as string | number | undefined,
  });
};

const getEventScopeFromValueClickTriggerContext = (
  eventScopeInput: ValueClickContext
): ValueClickTriggerEventScope => {
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
};

const getEventScopeFromRowClickTriggerContext = (
  ctx: RowClickContext
): RowClickTriggerEventScope => {
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
};

export const getEventScopeValues = (eventScopeInput: EventScopeInput): UrlDrilldownEventScope => {
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
};

const kind = monaco.languages.CompletionItemKind.Event;
const sortPrefix = '1.';

const valueClickVariables: readonly UrlTemplateEditorVariable[] = [
  {
    label: 'event.value',
    sortText: sortPrefix + 'event.value',
    title: i18n.translate('xpack.urlDrilldown.click.event.value.title', {
      defaultMessage: 'Click value.',
    }),
    documentation: i18n.translate('xpack.urlDrilldown.click.event.value.documentation', {
      defaultMessage: 'Value behind clicked data point.',
    }),
    kind,
  },
  {
    label: 'event.key',
    sortText: sortPrefix + 'event.key',
    title: i18n.translate('xpack.urlDrilldown.click.event.key.title', {
      defaultMessage: 'Name of clicked field.',
    }),
    documentation: i18n.translate('xpack.urlDrilldown.click.event.key.documentation', {
      defaultMessage: 'Field name behind clicked data point.',
    }),
    kind,
  },
  {
    label: 'event.negate',
    sortText: sortPrefix + 'event.negate',
    title: i18n.translate('xpack.urlDrilldown.click.event.negate.title', {
      defaultMessage: 'Whether the filter is negated.',
    }),
    documentation: i18n.translate('xpack.urlDrilldown.click.event.negate.documentation', {
      defaultMessage: 'Boolean, indicating whether clicked data point resulted in negative filter.',
    }),
    kind,
  },
  {
    label: 'event.points',
    sortText: sortPrefix + 'event.points',
    title: i18n.translate('xpack.urlDrilldown.click.event.points.title', {
      defaultMessage: 'List of all clicked points.',
    }),
    documentation: i18n.translate('xpack.urlDrilldown.click.event.points.documentation', {
      defaultMessage:
        'Some visualizations have clickable points that emit more than one data point. Use list of data points in case a single value is insufficient.',
    }),
    kind,
  },
];

const rowClickVariables: readonly UrlTemplateEditorVariable[] = [
  {
    label: 'event.values',
    sortText: sortPrefix + 'event.values',
    title: i18n.translate('xpack.urlDrilldown.row.event.values.title', {
      defaultMessage: 'List of row cell values.',
    }),
    documentation: i18n.translate('xpack.urlDrilldown.row.event.values.documentation', {
      defaultMessage: 'An array of all cell values for the raw on which the action will execute.',
    }),
    kind,
  },
  {
    label: 'event.keys',
    sortText: sortPrefix + 'event.keys',
    title: i18n.translate('xpack.urlDrilldown.row.event.keys.title', {
      defaultMessage: 'List of row cell fields.',
    }),
    documentation: i18n.translate('xpack.urlDrilldown.row.event.keys.documentation', {
      defaultMessage: 'An array of field names for each column.',
    }),
    kind,
  },
  {
    label: 'event.columnNames',
    sortText: sortPrefix + 'event.columnNames',
    title: i18n.translate('xpack.urlDrilldown.row.event.columnNames.title', {
      defaultMessage: 'List of table column names.',
    }),
    documentation: i18n.translate('xpack.urlDrilldown.row.event.columnNames.documentation', {
      defaultMessage: 'An array of column names.',
    }),
    kind,
  },
  {
    label: 'event.rowIndex',
    sortText: sortPrefix + 'event.rowIndex',
    title: i18n.translate('xpack.urlDrilldown.row.event.rowIndex.title', {
      defaultMessage: 'Clicked row index.',
    }),
    documentation: i18n.translate('xpack.urlDrilldown.row.event.rowIndex.documentation', {
      defaultMessage: 'Number, representing the row that was clicked, starting from 0.',
    }),
    kind,
  },
];

const selectRangeVariables: readonly UrlTemplateEditorVariable[] = [
  {
    label: 'event.key',
    sortText: sortPrefix + 'event.key',
    title: i18n.translate('xpack.urlDrilldown.range.event.key.title', {
      defaultMessage: 'Name of aggregation field.',
    }),
    documentation: i18n.translate('xpack.urlDrilldown.range.event.key.documentation', {
      defaultMessage: 'Aggregation field behind the selected range, if available.',
    }),
    kind,
  },
  {
    label: 'event.from',
    sortText: sortPrefix + 'event.from',
    title: i18n.translate('xpack.urlDrilldown.range.event.from.title', {
      defaultMessage: 'Range start value.',
    }),
    documentation: i18n.translate('xpack.urlDrilldown.range.event.from.documentation', {
      defaultMessage:
        '`from` value of the selected range. Depending on your data, could be either a date or number.',
    }),
    kind,
  },
  {
    label: 'event.to',
    sortText: sortPrefix + 'event.to',
    title: i18n.translate('xpack.urlDrilldown.range.event.to.title', {
      defaultMessage: 'Range end value.',
    }),
    documentation: i18n.translate('xpack.urlDrilldown.range.event.to.documentation', {
      defaultMessage:
        '`to` value of the selected range. Depending on your data, could be either a date or number.',
    }),
    kind,
  },
];

export const getEventVariableList = (
  context: ActionFactoryContext
): UrlTemplateEditorVariable[] => {
  const [trigger] = context.triggers;

  switch (trigger) {
    case VALUE_CLICK_TRIGGER:
      return [...valueClickVariables];
    case ROW_CLICK_TRIGGER:
      return [...rowClickVariables];
    case SELECT_RANGE_TRIGGER:
      return [...selectRangeVariables];
  }

  return [];
};
