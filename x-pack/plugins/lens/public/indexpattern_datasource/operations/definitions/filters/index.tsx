/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiForm, EuiFormRow } from '@elastic/eui';
import { Query } from 'src/plugins/data/public';
import { updateColumnParam } from '../../../state_helpers';
import { OperationDefinition } from '../index';
import { FieldBasedIndexPatternColumn } from '../column_types';
import { FiltersList } from './filters_list';
import { DataType } from '../../../../types';

const searchQueryLabel = i18n.translate('xpack.lens.indexPattern.filters', {
  defaultMessage: 'Search query',
});

export interface Filter {
  input: Query;
  label?: string;
}

export interface FiltersIndexPatternColumn extends FieldBasedIndexPatternColumn {
  operationType: 'filters';
  params: {
    filters: Filter[];
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
  isTransferable: () => true,

  buildColumn({ suggestedPriority, field, previousColumn }) {
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
      filters: column.params.filters.length > 0 ? column.params.filters : undefined,
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
    const layerIndexPattern = state.indexPatterns[state.layers[layerId].indexPatternId];

    return (
      <EuiForm>
        <EuiFormRow
          label={i18n.translate('xpack.lens.indexPattern.filters.queries', {
            defaultMessage: 'Queries',
          })}
        >
          <FiltersList
            indexPattern={layerIndexPattern}
            filters={currentColumn.params.filters}
            setFilters={(filters: Filter[]) =>
              setState(
                updateColumnParam({
                  state,
                  layerId,
                  currentColumn,
                  paramName: 'filters',
                  value: filters,
                })
              )
            }
          />
        </EuiFormRow>
      </EuiForm>
    );
  },
};
