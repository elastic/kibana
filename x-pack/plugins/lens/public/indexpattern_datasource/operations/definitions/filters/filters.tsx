/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import './filters.scss';

import React, { MouseEventHandler, useState } from 'react';
import { omit } from 'lodash';
import { i18n } from '@kbn/i18n';
import {
  EuiDragDropContext,
  EuiDraggable,
  EuiDroppable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  euiDragDropReorder,
  EuiButtonIcon,
  EuiButtonEmpty,
  EuiIcon,
  EuiFormRow,
  EuiLink,
  htmlIdGenerator,
} from '@elastic/eui';
import { updateColumnParam } from '../../../state_helpers';
import { OperationDefinition } from '../index';
import { FieldBasedIndexPatternColumn } from '../column_types';
import { FilterPopover } from './filter_popover';
import { IndexPattern } from '../../../types';
import { Query, esKuery, esQuery } from '../../../../../../../../src/plugins/data/public';

const generateId = htmlIdGenerator();

// references types from src/plugins/data/common/search/aggs/buckets/filters.ts
export interface Filter {
  input: Query;
  label: string;
}
export interface FilterValue {
  input: Query;
  label: string;
  id: string;
}

const customQueryLabel = i18n.translate('xpack.lens.indexPattern.customQuery', {
  defaultMessage: 'Custom query',
});

export const defaultLabel = i18n.translate('xpack.lens.indexPattern.filters.label.placeholder', {
  defaultMessage: 'All records',
});

// to do: get the language from uiSettings
const defaultFilter: Filter = {
  input: {
    query: '',
    language: 'kuery',
  },
  label: '',
};

export const isQueryValid = (input: Query, indexPattern: IndexPattern) => {
  try {
    if (input.language === 'kuery') {
      esKuery.toElasticsearchQuery(esKuery.fromKueryExpression(input.query), indexPattern);
    } else {
      esQuery.luceneStringToDsl(input.query);
    }
    return true;
  } catch (e) {
    return false;
  }
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
  displayName: customQueryLabel,
  priority: 3, // Higher than any metric
  getPossibleOperationForField: ({ type }) => {
    if (type === 'document') {
      return {
        dataType: 'string',
        isBucketed: true,
        scale: 'ordinal',
      };
    }
  },
  isTransferable: () => false,

  onFieldChange: (oldColumn, indexPattern, field) => oldColumn,

  buildColumn({ suggestedPriority, field, previousColumn }) {
    let params = { filters: [defaultFilter] };
    if (previousColumn?.operationType === 'terms') {
      params = {
        filters: [
          {
            label: '',
            input: {
              query: `${previousColumn.sourceField} : *`,
              language: 'kuery',
            },
          },
        ],
      };
    }

    return {
      label: customQueryLabel,
      dataType: 'string',
      operationType: 'filters',
      scale: 'ordinal',
      suggestedPriority,
      isBucketed: true,
      sourceField: field.name,
      params,
    };
  },

  toEsAggsFn: (column, columnId, indexPattern) => {
    const validFilters = column.params.filters?.filter((f: Filter) =>
      isQueryValid(f.input, indexPattern)
    );
    return {
      type: 'function',
      function: 'aggFilters',
      arguments: {
        id: [columnId],
        enabled: [true],
        schema: ['segment'],
        filters:
          validFilters?.length > 0
            ? [JSON.stringify(validFilters)]
            : [JSON.stringify(defaultFilter)],
      },
    };
  },

  paramEditor: ({ state, setState, currentColumn, layerId, data }) => {
    const indexPattern = state.indexPatterns[state.layers[layerId].indexPatternId];
    const filters = currentColumn.params.filters;

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
      <EuiFormRow>
        <FilterList
          filters={filters}
          setFilters={setFilters}
          indexPattern={indexPattern}
          defaultQuery={defaultFilter}
        />
      </EuiFormRow>
    );
  },
};

export const FilterList = ({
  filters,
  setFilters,
  indexPattern,
  defaultQuery,
}: {
  filters: Filter[];
  setFilters: Function;
  indexPattern: IndexPattern;
  defaultQuery: Filter;
}) => {
  const [isOpenByCreation, setIsOpenByCreation] = useState(false);
  const [localFilters, setLocalFilters] = useState(() =>
    filters.map((filter) => ({ ...filter, id: generateId() }))
  );

  const updateFilters = (updatedFilters: FilterValue[]) => {
    // do not set internal id parameter into saved object
    setFilters(updatedFilters.map((filter) => omit(filter, 'id')));
    setLocalFilters(updatedFilters);
  };

  const onAddFilter = () =>
    updateFilters([
      ...localFilters,
      {
        ...defaultQuery,
        id: generateId(),
      },
    ]);
  const onRemoveFilter = (id: string) =>
    updateFilters(localFilters.filter((filter) => filter.id !== id));

  const onChangeValue = (id: string, query: Query, label: string) =>
    updateFilters(
      localFilters.map((filter) =>
        filter.id === id
          ? {
              ...filter,
              input: query,
              label,
            }
          : filter
      )
    );

  const onDragEnd = ({
    source,
    destination,
  }: {
    source?: DraggableLocation;
    destination?: DraggableLocation;
  }) => {
    if (source && destination) {
      const items = euiDragDropReorder(localFilters, source.index, destination.index);
      updateFilters(items);
    }
  };

  return (
    <>
      <EuiDragDropContext onDragEnd={onDragEnd} onDragStart={() => setIsOpenByCreation(false)}>
        <EuiDroppable droppableId="FILTERS_DROPPABLE_AREA" spacing="s">
          {localFilters?.map((filter: FilterValue, idx: number) => {
            const { input, label, id } = filter;
            const queryIsValid = isQueryValid(input, indexPattern);

            return (
              <EuiDraggable
                spacing="m"
                key={id}
                index={idx}
                draggableId={id}
                disableInteractiveElementBlocking
              >
                {(provided) => (
                  <EuiPanel paddingSize="none">
                    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                      <EuiFlexItem grow={false}>{/* Empty for spacing */}</EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiIcon
                          size="s"
                          color={queryIsValid ? 'subdued' : 'danger'}
                          type={queryIsValid ? 'grab' : 'alert'}
                          title={
                            queryIsValid
                              ? i18n.translate('xpack.lens.indexPattern.filters.dragToReorder', {
                                  defaultMessage: 'Drag to reorder',
                                })
                              : i18n.translate('xpack.lens.indexPattern.filters.isInvalid', {
                                  defaultMessage: 'This query is invalid',
                                })
                          }
                        />
                      </EuiFlexItem>
                      <EuiFlexItem
                        grow={true}
                        data-test-subj="indexPattern-filters-existingFilterContainer"
                      >
                        <FilterPopover
                          isOpenByCreation={idx === localFilters.length - 1 && isOpenByCreation}
                          setIsOpenByCreation={setIsOpenByCreation}
                          indexPattern={indexPattern}
                          filter={filter}
                          Button={({ onClick }: { onClick: MouseEventHandler }) => (
                            <EuiLink
                              className="lnsFiltersOperation__popoverButton"
                              data-test-subj="indexPattern-filters-existingFilterTrigger"
                              onClick={onClick}
                              color={queryIsValid ? 'text' : 'danger'}
                              title={i18n.translate('xpack.lens.indexPattern.filters.clickToEdit', {
                                defaultMessage: 'Click to edit',
                              })}
                            >
                              {label || input.query || defaultLabel}
                            </EuiLink>
                          )}
                          setFilter={(f: FilterValue) => {
                            onChangeValue(f.id, f.input, f.label);
                          }}
                        />
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiButtonIcon
                          iconSize="s"
                          iconType="cross"
                          color="danger"
                          data-test-subj="indexPattern-filters-existingFilterDelete"
                          onClick={() => {
                            onRemoveFilter(filter.id);
                          }}
                          aria-label={i18n.translate(
                            'xpack.lens.indexPattern.filters.removeCustomQuery',
                            {
                              defaultMessage: 'Remove custom query',
                            }
                          )}
                          title={i18n.translate('xpack.lens.indexPattern.filters.remove', {
                            defaultMessage: 'Remove',
                          })}
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

      <EuiButtonEmpty
        size="xs"
        iconType="plusInCircle"
        onClick={() => {
          onAddFilter();
          setIsOpenByCreation(true);
        }}
      >
        {i18n.translate('xpack.lens.indexPattern.filters.addCustomQuery', {
          defaultMessage: 'Add a custom query',
        })}
      </EuiButtonEmpty>
    </>
  );
};
