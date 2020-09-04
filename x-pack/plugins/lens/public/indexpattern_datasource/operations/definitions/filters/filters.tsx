/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { MouseEventHandler, useState } from 'react';
import { omit } from 'lodash';
import { i18n } from '@kbn/i18n';
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
  htmlIdGenerator,
} from '@elastic/eui';

import { Query, DataPublicPluginStart } from 'src/plugins/data/public';
import { IUiSettingsClient } from 'kibana/public';
import { useKibana } from '../../../../../../../../src/plugins/kibana_react/public';
import { updateColumnParam } from '../../../state_helpers';
import { OperationDefinition } from '../index';
import { FieldBasedIndexPatternColumn } from '../column_types';
import { FilterPopover } from './filter_popover';
import { IndexPattern } from '../../../types';

const generateId = htmlIdGenerator();
export interface Filter {
  input: Query;
  label: string;
}
export interface FilterValue {
  input: Query;
  label: string;
  id: string;
}

const searchQueryLabel = i18n.translate('xpack.lens.indexPattern.searchQuery', {
  defaultMessage: 'Search query',
});

export const defaultLabel = i18n.translate('xpack.lens.indexPattern.filters.label.placeholder', {
  defaultMessage: 'All records',
});

const defaultSearchQuery: Filter = {
  input: {
    query: '',
    language: 'kuery',
  },
  label: '',
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
        dataType: 'string',
        isBucketed: true,
        scale: 'ordinal',
      };
    }
  },
  isTransferable: () => false,

  onFieldChange: (oldColumn, indexPattern, field) => oldColumn,

  buildColumn({ suggestedPriority, field }) {
    return {
      label: searchQueryLabel,
      dataType: 'string',
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

  paramEditor: ({ state, setState, currentColumn, layerId }) => {
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
      <EuiForm>
        <EuiFormRow
          label={i18n.translate('xpack.lens.indexPattern.filters.queries', {
            defaultMessage: 'Queries',
          })}
        >
          <FilterList filters={filters} setFilters={setFilters} indexPattern={indexPattern} />
        </EuiFormRow>
      </EuiForm>
    );
  },
};

export const FilterList = ({
  filters,
  setFilters,
  indexPattern,
}: {
  filters: Filter[];
  setFilters: Function;
  indexPattern: IndexPattern;
}) => {
  const [isOpenByCreation, setIsOpenByCreation] = useState(false);
  const [localFilters, setLocalFilters] = useState(() =>
    filters.map((filter) => ({ ...filter, id: generateId() }))
  );

  const { services } = useKibana<{ uiSettings: IUiSettingsClient; data: DataPublicPluginStart }>();

  const updateFilters = (updatedFilters: FilterValue[]) => {
    // do not set internal id parameter into saved object
    setFilters(updatedFilters.map((filter) => omit(filter, 'id') as FilterValue));
    setLocalFilters(updatedFilters);
  };

  const onAddFilter = () =>
    updateFilters([
      ...localFilters,
      {
        input: services.data.query.queryString.getDefaultQuery(),
        label: '',
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
    <div>
      <EuiDragDropContext onDragEnd={onDragEnd}>
        <EuiDroppable droppableId="FILTERS_DROPPABLE_AREA" spacing="s">
          {localFilters?.map((filter: FilterValue, idx: number) => {
            const { input, label, id } = filter;
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
                    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
                      <EuiFlexItem grow={false}>
                        <div className="lnsLayerPanel__dndGrab">
                          <EuiIcon
                            type="grab"
                            aria-label={i18n.translate('xpack.lens.indexPattern.filters.grabIcon', {
                              defaultMessage: 'Grab icon',
                            })}
                          />
                        </div>
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
                              color="text"
                              onClick={onClick}
                              className="lnsLayerPanel__filterLink"
                              data-test-subj="indexPattern-filters-existingFilterTrigger"
                            >
                              <EuiText size="s" textAlign="left">
                                {label || input.query || defaultLabel}
                              </EuiText>
                            </EuiLink>
                          )}
                          setFilter={(f: FilterValue) => {
                            onChangeValue(f.id, f.input, f.label);
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
                            onRemoveFilter(filter.id);
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

      <EuiButtonEmpty
        iconType="plusInCircle"
        onClick={() => {
          onAddFilter();
          setIsOpenByCreation(true);
        }}
      >
        {i18n.translate('xpack.lens.indexPattern.filters.addSearchQuery', {
          defaultMessage: 'Add a search query',
        })}
      </EuiButtonEmpty>
    </div>
  );
};
