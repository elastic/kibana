/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './filters.scss';
import React, { useState } from 'react';
import { fromKueryExpression, luceneStringToDsl, toElasticsearchQuery } from '@kbn/es-query';
import { omit } from 'lodash';
import { i18n } from '@kbn/i18n';
import { EuiFormRow, EuiLink, htmlIdGenerator } from '@elastic/eui';
import { updateColumnParam } from '../../layer_helpers';
import type { OperationDefinition } from '../index';
import type { BaseIndexPatternColumn } from '../column_types';
import { FilterPopover } from './filter_popover';
import type { IndexPattern } from '../../../types';
import type { AggFunctionsMapping, Query } from '../../../../../../../../src/plugins/data/public';
import { queryFilterToAst } from '../../../../../../../../src/plugins/data/common';
import { buildExpressionFunction } from '../../../../../../../../src/plugins/expressions/public';
import { NewBucketButton, DragDropBuckets, DraggableBucketContainer } from '../shared_components';

const generateId = htmlIdGenerator();
const OPERATION_NAME = 'filters';

// references types from src/plugins/data/common/search/aggs/buckets/filters.ts
export interface Filter {
  input: Query;
  label: string;
}

export interface FilterValue {
  id: string;
  input: Query;
  label: string;
}

const filtersLabel = i18n.translate('xpack.lens.indexPattern.filters', {
  defaultMessage: 'Filters',
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

export const validateQuery = (input: Query, indexPattern: IndexPattern) => {
  let isValid = true;
  let error: string | undefined;

  try {
    if (input.language === 'kuery') {
      toElasticsearchQuery(fromKueryExpression(input.query), indexPattern);
    } else {
      luceneStringToDsl(input.query);
    }
  } catch (e) {
    isValid = false;
    error = e.message;
  }

  return { isValid, error };
};

export const isQueryValid = (input: Query, indexPattern: IndexPattern) =>
  validateQuery(input, indexPattern).isValid;

export interface FiltersIndexPatternColumn extends BaseIndexPatternColumn {
  operationType: typeof OPERATION_NAME;
  params: {
    filters: Filter[];
  };
}

export const filtersOperation: OperationDefinition<FiltersIndexPatternColumn, 'none'> = {
  type: OPERATION_NAME,
  displayName: filtersLabel,
  priority: 3, // Higher than any metric
  input: 'none',
  isTransferable: () => true,

  getDefaultLabel: () => filtersLabel,
  buildColumn({ previousColumn }) {
    let params = { filters: [defaultFilter] };
    if (previousColumn?.operationType === 'terms' && 'sourceField' in previousColumn) {
      params = {
        filters: [
          {
            label: '',
            input: {
              query: `${previousColumn.sourceField} : *`,
              language: 'kuery',
            },
          },
          ...((
            previousColumn as { params?: { secondaryFields?: string[] } }
          ).params?.secondaryFields?.map((field) => ({
            label: '',
            input: {
              query: `${field} : *`,
              language: 'kuery',
            },
          })) ?? []),
        ],
      };
    }

    return {
      label: filtersLabel,
      dataType: 'string',
      operationType: OPERATION_NAME,
      scale: 'ordinal',
      isBucketed: true,
      params,
    };
  },

  getPossibleOperation() {
    return {
      dataType: 'string',
      isBucketed: true,
      scale: 'ordinal',
    };
  },

  toEsAggsFn: (column, columnId, indexPattern) => {
    const validFilters = column.params.filters?.filter((f: Filter) =>
      isQueryValid(f.input, indexPattern)
    );
    return buildExpressionFunction<AggFunctionsMapping['aggFilters']>('aggFilters', {
      id: columnId,
      enabled: true,
      schema: 'segment',
      filters: (validFilters?.length > 0 ? validFilters : [defaultFilter]).map(queryFilterToAst),
    }).toAst();
  },

  paramEditor: ({ layer, columnId, currentColumn, indexPattern, updateLayer, data }) => {
    const filters = currentColumn.params.filters;

    const setFilters = (newFilters: Filter[]) =>
      updateLayer(
        updateColumnParam({
          layer,
          columnId,
          paramName: OPERATION_NAME,
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
  const [activeFilterId, setActiveFilterId] = useState('');
  const [localFilters, setLocalFilters] = useState(() =>
    filters.map((filter) => ({ ...filter, id: generateId() }))
  );

  const updateFilters = (updatedFilters: FilterValue[]) => {
    // do not set internal id parameter into saved object
    setFilters(updatedFilters.map((filter) => omit(filter, 'id')));
    setLocalFilters(updatedFilters);
  };

  const onAddFilter = () => {
    const newFilterId = generateId();

    updateFilters([
      ...localFilters,
      {
        ...defaultQuery,
        id: newFilterId,
      },
    ]);

    setActiveFilterId(newFilterId);
  };
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

  const changeActiveFilter = (filterId: string) => {
    let newActiveFilterId = filterId;
    if (activeFilterId === filterId) {
      newActiveFilterId = ''; // toggle off
    }
    setActiveFilterId(newActiveFilterId);
  };

  return (
    <>
      <DragDropBuckets
        onDragEnd={updateFilters}
        onDragStart={() => {}}
        droppableId="FILTERS_DROPPABLE_AREA"
        items={localFilters}
      >
        {localFilters?.map((filter: FilterValue, idx: number) => {
          const isInvalid = !isQueryValid(filter.input, indexPattern);

          return (
            <DraggableBucketContainer
              id={filter.id}
              key={filter.id}
              idx={idx}
              isInvalid={isInvalid}
              invalidMessage={i18n.translate('xpack.lens.indexPattern.filters.isInvalid', {
                defaultMessage: 'This query is invalid',
              })}
              onRemoveClick={() => onRemoveFilter(filter.id)}
              removeTitle={i18n.translate('xpack.lens.indexPattern.filters.removeFilter', {
                defaultMessage: 'Remove a filter',
              })}
              isNotRemovable={localFilters.length === 1}
            >
              <FilterPopover
                data-test-subj="indexPattern-filters-existingFilterContainer"
                isOpen={filter.id === activeFilterId}
                triggerClose={() => changeActiveFilter('')}
                indexPattern={indexPattern}
                filter={filter}
                setFilter={(f: FilterValue) => {
                  onChangeValue(f.id, f.input, f.label);
                }}
                button={
                  <EuiLink
                    className="lnsFiltersOperation__popoverButton"
                    data-test-subj="indexPattern-filters-existingFilterTrigger"
                    onClick={() => changeActiveFilter(filter.id)}
                    color={isInvalid ? 'danger' : 'text'}
                    title={i18n.translate('xpack.lens.indexPattern.filters.clickToEdit', {
                      defaultMessage: 'Click to edit',
                    })}
                  >
                    {filter.label || filter.input.query || defaultLabel}
                  </EuiLink>
                }
              />
            </DraggableBucketContainer>
          );
        })}
      </DragDropBuckets>
      <NewBucketButton
        onClick={() => {
          onAddFilter();
        }}
        label={i18n.translate('xpack.lens.indexPattern.filters.addaFilter', {
          defaultMessage: 'Add a filter',
        })}
      />
    </>
  );
};
