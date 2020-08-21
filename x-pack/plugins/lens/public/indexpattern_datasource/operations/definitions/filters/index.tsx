/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiForm, EuiFormRow, EuiRange, EuiSelect } from '@elastic/eui';
import { Query } from 'src/plugins/data/public';
import { IndexPatternColumn } from '../../../indexpattern';
import { updateColumnParam } from '../../../state_helpers';
import { DataType } from '../../../../types';
import { OperationDefinition } from '../index';
import { FieldBasedIndexPatternColumn } from '../column_types';
import { FiltersList } from './filters_dnd';

type PropType<C> = C extends React.ComponentType<infer P> ? P : unknown;

// Add ticks to EuiRange component props
const FixedEuiRange = (EuiRange as unknown) as React.ComponentType<
  PropType<typeof EuiRange> & {
    ticks?: Array<{
      label: string;
      value: number;
    }>;
  }
>;

function ofName() {
  return i18n.translate('xpack.lens.indexPattern.filters.label', {
    defaultMessage: 'Search query',
  });
}

function isSortableByColumn(column: IndexPatternColumn) {
  return !column.isBucketed;
}

const DEFAULT_SIZE = 3;
const supportedTypes = new Set(['string', 'boolean', 'number', 'ip']);

// interface Filter {
//   input: {Query & {label?: string } }
// }

export interface Filter {
  input: Query;
  label?: string;
}

export interface FiltersIndexPatternColumn extends FieldBasedIndexPatternColumn {
  operationType: 'filters';
  params: {
    filters: Filter[];
    size: number;
    orderBy: { type: 'alphabetical' } | { type: 'column'; columnId: string };
    orderDirection: 'asc' | 'desc';
  };
}

export const filtersOperation: OperationDefinition<FiltersIndexPatternColumn> = {
  type: 'filters',
  displayName: i18n.translate('xpack.lens.indexPattern.filters', {
    defaultMessage: 'Filters',
  }),
  priority: 3, // Higher than any metric
  getPossibleOperationForField: ({ aggregationRestrictions, aggregatable, type }) => {
    if (type === 'document') {
      return {
        dataType: 'number',
        isBucketed: true,
        scale: 'ordinal',
      };
    }
  },
  isTransferable: (column, newIndexPattern) => {
    const newField = newIndexPattern.fields.find((field) => field.name === column.sourceField);

    return Boolean(
      newField &&
        supportedTypes.has(newField.type) &&
        newField.aggregatable &&
        (!newField.aggregationRestrictions || newField.aggregationRestrictions.filters) // no se
    );
  },
  buildColumn({ suggestedPriority, columns }) {
    const existingMetricColumn = Object.entries(columns)
      .filter(([_columnId, column]) => column && isSortableByColumn(column))
      .map(([id]) => id)[0];

    return {
      label: ofName(),
      operationType: 'filters',
      scale: 'ordinal',
      suggestedPriority,
      isBucketed: true,
      params: {
        size: DEFAULT_SIZE,
        orderBy: existingMetricColumn
          ? { type: 'column', columnId: existingMetricColumn }
          : { type: 'alphabetical' },
        orderDirection: existingMetricColumn ? 'desc' : 'asc',
        filters: [],
      },
    };
  },

  toEsAggsConfig: (column, columnId) => ({
    id: columnId,
    enabled: true,
    type: 'filters',
    schema: 'segment',
    params: {
      filters: column.params.filters.length > 0 ? column.params.filters : undefined,
    },
  }),

  onFieldChange: (oldColumn, indexPattern, field) => {
    return {
      ...oldColumn,
      label: ofName(field.name),
      sourceField: field.name,
    };
  },
  onOtherColumnChanged: (currentColumn, columns) => {
    if (currentColumn.params.orderBy.type === 'column') {
      // check whether the column is still there and still a metric
      const columnSortedBy = columns[currentColumn.params.orderBy.columnId];
      if (!columnSortedBy || !isSortableByColumn(columnSortedBy)) {
        return {
          ...currentColumn,
          params: {
            ...currentColumn.params,
            orderBy: { type: 'alphabetical' },
            orderDirection: 'asc',
          },
        };
      }
    }
    return currentColumn;
  },
  paramEditor: ({ state, setState, currentColumn, layerId }) => {
    const SEPARATOR = '$$$';
    function toValue(orderBy: FiltersIndexPatternColumn['params']['orderBy']) {
      if (orderBy.type === 'alphabetical') {
        return orderBy.type;
      }
      return `${orderBy.type}${SEPARATOR}${orderBy.columnId}`;
    }

    function fromValue(value: string): FiltersIndexPatternColumn['params']['orderBy'] {
      if (value === 'alphabetical') {
        return { type: 'alphabetical' };
      }
      const parts = value.split(SEPARATOR);
      return {
        type: 'column',
        columnId: parts[1],
      };
    }

    function onFiltersChange(filters: Filters) {
      // validation
      setState(updateColumnParam({ state, layerId, currentColumn, paramName: 'filters', filters }));
    }

    const orderOptions = Object.entries(state.layers[layerId].columns)
      .filter(([_columnId, column]) => isSortableByColumn(column))
      .map(([columnId, column]) => {
        return {
          value: toValue({ type: 'column', columnId }),
          text: column.label,
        };
      });
    orderOptions.push({
      value: toValue({ type: 'alphabetical' }),
      text: i18n.translate('xpack.lens.indexPattern.filters.orderAlphabetical', {
        defaultMessage: 'Alphabetical',
      }),
    });
    return (
      <EuiForm>
        <EuiFormRow
          label={i18n.translate('xpack.lens.indexPattern.filters.queries', {
            defaultMessage: 'Queries',
          })}
        >
          <div>
            <FiltersList
              indexPattern={state.indexPatterns[state.currentIndexPatternId]}
              filters={currentColumn.params.filters}
              setFilters={(filters) => {
                setState(
                  updateColumnParam({
                    state,
                    layerId,
                    currentColumn,
                    paramName: 'filters',
                    value: filters,
                  })
                );
              }}
            />
          </div>
        </EuiFormRow>
      </EuiForm>
    );
  },
};
