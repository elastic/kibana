/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { MouseEventHandler } from 'react';
import { i18n } from '@kbn/i18n';
import { Query } from 'src/plugins/data/public';
import {
  EuiDragDropContext,
  EuiDraggable,
  EuiDroppable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  euiDragDropReorder,
  EuiButtonIcon,
  EuiLink,
  EuiText,
  EuiButtonEmpty,
  EuiForm,
  EuiFormRow,
} from '@elastic/eui';
import { updateColumnParam } from '../../../state_helpers';
import { OperationDefinition } from '../index';
import { FieldBasedIndexPatternColumn } from '../column_types';
import { FilterPopover } from './filter_popover';
import { DataType } from '../../../../types';

export enum SEARCH_QUERY_LANGUAGE {
  KUERY = 'kuery',
  LUCENE = 'lucene',
}

export interface Filter {
  input: Query;
  label?: string;
}

export const emptyFilter: Filter = {
  input: {
    query: '',
    language: SEARCH_QUERY_LANGUAGE.KUERY,
  },
  label: '',
};

const searchQueryLabel = i18n.translate('xpack.lens.indexPattern.searchQuery', {
  defaultMessage: 'Search query',
});

const defaultSearchQuery: Filter = {
  input: {
    query: '*',
    language: 'kuery',
  },
  label: i18n.translate('xpack.lens.indexPattern.searchQueryDefault', {
    defaultMessage: 'All records',
  }),
};

const countDuplicates = (filterArr: Filter[], filter: Filter) =>
  filterArr.filter(
    (f) =>
      JSON.stringify(f.input.query.trim()) === JSON.stringify(filter.input.query.trim()) &&
      f.label === filter.label
  ).length;

const makeUniqueLabel = (filterArr: Filter[], filter: Filter) => {
  let label = '';
  let count = 0;
  do {
    count++;
    label = `${filter.input.query} [${count}]`;
  } while (filterArr.find((f) => f.label === label));
  return label;
};

interface DraggableLocation {
  droppableId: string;
  index: number;
}

export interface FiltersIndexPatternColumn extends FieldBasedIndexPatternColumn {
  operationType: 'filters';
  params: {
    filters: Filter[];
  };
}

export const filtersOperation: OperationDefinition<FiltersIndexPatternColumn> = {
  type: 'filters',
  displayName: searchQueryLabel,
  priority: 3, // Higher than any metric
  getPossibleOperationForField: ({ type }) => {
    if (type === 'document') {
      return {
        dataType: 'number',
        isBucketed: true,
        scale: 'ordinal',
      };
    }
  },
  isTransferable: () => false,

  buildColumn({ suggestedPriority, field }) {
    return {
      label: searchQueryLabel,
      dataType: field.type as DataType,
      operationType: 'filters',
      scale: 'ordinal',
      suggestedPriority,
      isBucketed: true,
      sourceField: field.name,
      params: {
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
      filters: column.params.filters.length > 0 ? column.params.filters : [defaultSearchQuery],
    },
  }),
  onFieldChange: (oldColumn, indexPattern, field) => {
    return {
      ...oldColumn,
      label: field.displayName,
      sourceField: field.name,
    };
  },
  paramEditor: ({ state, setState, currentColumn, layerId }) => {
    const indexPattern = state.indexPatterns[state.layers[layerId].indexPatternId];

    const filters = currentColumn.params.filters;

    const onDragEnd = ({
      source,
      destination,
    }: {
      source?: DraggableLocation;
      destination?: DraggableLocation;
    }) => {
      if (source && destination) {
        const items = euiDragDropReorder(filters, source.index, destination.index);
        setFilters(items);
      }
    };

    const setFilters = (newFilters: Filter[]) =>
      setState(
        updateColumnParam({
          state,
          layerId,
          currentColumn,
          paramName: 'filters',
          value: newFilters,
        })
      );

    return (
      <EuiForm>
        <EuiFormRow
          label={i18n.translate('xpack.lens.indexPattern.filters.queries', {
            defaultMessage: 'Queries',
          })}
        >
          <div>
            <EuiDragDropContext onDragEnd={onDragEnd}>
              <EuiDroppable droppableId="FILTERS_DROPPABLE_AREA" spacing="s">
                {filters?.map((filter: Filter, idx: number) => {
                  const { input, label } = filter;
                  const id = `${JSON.stringify(input.query)}_${label}`;
                  return (
                    <EuiDraggable
                      spacing="m"
                      key={id}
                      index={idx}
                      draggableId={id}
                      customDragHandle={true}
                    >
                      {(provided) => (
                        <EuiPanel paddingSize="none">
                          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
                            <EuiFlexItem grow={false}>
                              <div {...provided.dragHandleProps} className="lnsLayerPanel__dndGrab">
                                <EuiIcon
                                  type="grab"
                                  aria-label={i18n.translate(
                                    'xpack.lens.indexPattern.filters.grabIcon',
                                    {
                                      defaultMessage: 'Grab icon',
                                    }
                                  )}
                                />
                              </div>
                            </EuiFlexItem>
                            <EuiFlexItem
                              grow={true}
                              data-test-subj="indexPattern-filters-existingFilterContainer"
                            >
                              <FilterPopover
                                indexPattern={indexPattern}
                                filter={filter}
                                Button={({ onClick }: { onClick: MouseEventHandler }) => (
                                  <EuiLink
                                    color="text"
                                    onClick={onClick}
                                    className="lnsLayerPanel__filterLink"
                                    data-test-subj="indexPattern-filters-existingFilterTrigger"
                                  >
                                    <EuiText size="s" textAlign="left">
                                      {label ? label : input.query}
                                    </EuiText>
                                  </EuiLink>
                                )}
                                setFilter={(newFilter: Filter) => {
                                  if (countDuplicates(filters, newFilter) > 0) {
                                    newFilter.label = makeUniqueLabel(filters, newFilter);
                                  }
                                  setFilters(
                                    filters.map((f: Filter) => (f === filter ? newFilter : f))
                                  );
                                }}
                              />
                            </EuiFlexItem>
                            <EuiFlexItem grow={false}>
                              <EuiButtonIcon
                                size="m"
                                iconType="cross"
                                color="danger"
                                data-test-subj="indexPattern-filters-existingFilterDelete"
                                onClick={() => {
                                  setFilters(filters.filter((f: Filter) => f !== filter));
                                }}
                                aria-label={i18n.translate(
                                  'xpack.lens.indexPattern.filters.deleteSearchQuery',
                                  {
                                    defaultMessage: 'Delete search query',
                                  }
                                )}
                              />
                            </EuiFlexItem>
                          </EuiFlexGroup>
                        </EuiPanel>
                      )}
                    </EuiDraggable>
                  );
                })}
              </EuiDroppable>
            </EuiDragDropContext>

            <FilterPopover
              indexPattern={indexPattern}
              filter={emptyFilter}
              Button={({ onClick }: { onClick: MouseEventHandler }) => (
                <EuiButtonEmpty iconType="plusInCircle" onClick={onClick}>
                  {i18n.translate('xpack.lens.indexPattern.filters.addSearchQuery', {
                    defaultMessage: 'Add a search query',
                  })}
                </EuiButtonEmpty>
              )}
              setFilter={(newFilter: Filter) => {
                if (countDuplicates(filters, newFilter) > 0) {
                  newFilter.label = makeUniqueLabel(filters, newFilter);
                }
                setFilters(filters.concat(newFilter));
              }}
            />
          </div>
        </EuiFormRow>
      </EuiForm>
    );
  },
};
