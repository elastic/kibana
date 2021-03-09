/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon } from '@elastic/eui';
import { EuiFormRow, EuiFlexItem, EuiFlexGroup } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { Query } from 'src/plugins/data/public';
import { IndexPatternColumn, operationDefinitionMap } from '../operations';
import { QueryInput } from '../query_input';
import { IndexPattern, IndexPatternLayer } from '../types';

// to do: get the language from uiSettings
export const defaultFilter: Query = {
  query: '',
  language: 'kuery',
};

export function setFilter(columnId: string, layer: IndexPatternLayer, query: Query | undefined) {
  return {
    ...layer,
    columns: {
      ...layer.columns,
      [columnId]: {
        ...layer.columns[columnId],
        filter: query,
      },
    },
  };
}

export function Filtering({
  selectedColumn,
  columnId,
  layer,
  updateLayer,
  indexPattern,
}: {
  selectedColumn: IndexPatternColumn;
  indexPattern: IndexPattern;
  columnId: string;
  layer: IndexPatternLayer;
  updateLayer: (newLayer: IndexPatternLayer) => void;
}) {
  const selectedOperation = operationDefinitionMap[selectedColumn.operationType];
  if (!selectedOperation.filterable || !selectedColumn.filter) {
    return null;
  }

  return (
    <EuiFormRow
      display="columnCompressed"
      fullWidth
      label={i18n.translate('xpack.lens.indexPattern.filterBy.label', {
        defaultMessage: 'Filter by',
      })}
    >
      <EuiFlexGroup gutterSize="s" alignItems="center">
        <EuiFlexItem>
          <QueryInput
            indexPattern={indexPattern}
            data-test-subj="indexPattern-time-scaling-unit"
            value={selectedColumn.filter || defaultFilter}
            onChange={(newQuery) => {
              updateLayer(setFilter(columnId, layer, newQuery));
            }}
            isInvalid={false}
            onSubmit={() => {}}
            disableAutoFocus={true}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            data-test-subj="indexPattern-filter-by-remove"
            color="danger"
            aria-label={i18n.translate('xpack.lens.filterBy.removeLabel', {
              defaultMessage: 'Remove filter',
            })}
            onClick={() => {
              updateLayer(setFilter(columnId, layer, undefined));
            }}
            iconType="cross"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFormRow>
  );
}
