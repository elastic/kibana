/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import './filters.scss';

import React, { MouseEventHandler, useState } from 'react';
import { omit } from 'lodash';
import { i18n } from '@kbn/i18n';
import { EuiFormRow, EuiLink, htmlIdGenerator } from '@elastic/eui';
import { updateColumnParam } from '../../layer_helpers';
import { OperationDefinition } from '../index';
import { BaseIndexPatternColumn } from '../column_types';
import { FilterPopover } from './filter_popover';
import { IndexPattern } from '../../../types';
import { Query, esKuery, esQuery } from '../../../../../../../../src/plugins/data/public';
import { NewBucketButton, DragDropBuckets, DraggableBucketContainer } from '../shared_components';

const generateId = htmlIdGenerator();

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

export interface FiltersIndexPatternColumn extends BaseIndexPatternColumn {
  operationType: 'filters';
  params: {
    filters: Filter[];
  };
}

export const filtersOperation: OperationDefinition<FiltersIndexPatternColumn, 'none'> = {
  type: 'filters',
  displayName: filtersLabel,
  priority: 3, // Higher than any metric
  input: 'none',
  isTransferable: () => true,

  getDefaultLabel: () => filtersLabel,
  buildColumn({ previousColumn }) {
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
      label: filtersLabel,
      dataType: 'string',
      operationType: 'filters',
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

  toEsAggsConfig: (column, columnId, indexPattern) => {
    const validFilters = column.params.filters?.filter((f: Filter) =>
      isQueryValid(f.input, indexPattern)
    );
    return {
      id: columnId,
      enabled: true,
      type: 'filters',
      schema: 'segment',
      params: {
        filters: validFilters?.length > 0 ? validFilters : [defaultFilter],
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
                initiallyOpen={idx === localFilters.length - 1 && isOpenByCreation}
                indexPattern={indexPattern}
                filter={filter}
                setFilter={(f: FilterValue) => {
                  onChangeValue(f.id, f.input, f.label);
                }}
                Button={({ onClick }: { onClick: MouseEventHandler }) => (
                  <EuiLink
                    className="lnsFiltersOperation__popoverButton"
                    data-test-subj="indexPattern-filters-existingFilterTrigger"
                    onClick={onClick}
                    color={isInvalid ? 'danger' : 'text'}
                    title={i18n.translate('xpack.lens.indexPattern.filters.clickToEdit', {
                      defaultMessage: 'Click to edit',
                    })}
                  >
                    {filter.label || filter.input.query || defaultLabel}
                  </EuiLink>
                )}
              />
            </DraggableBucketContainer>
          );
        })}
      </DragDropBuckets>
      <NewBucketButton
        onClick={() => {
          onAddFilter();
          setIsOpenByCreation(true);
        }}
        label={i18n.translate('xpack.lens.indexPattern.filters.addaFilter', {
          defaultMessage: 'Add a filter',
        })}
      />
    </>
  );
};
