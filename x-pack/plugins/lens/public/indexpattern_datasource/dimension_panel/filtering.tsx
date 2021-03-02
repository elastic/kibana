/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiToolTip } from '@elastic/eui';
import { EuiIcon } from '@elastic/eui';
import { EuiFormRow, EuiFlexItem, EuiFlexGroup } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { Query } from 'src/plugins/data/public';
import { IndexPatternColumn, operationDefinitionMap } from '../operations';
import { QueryInput } from '../operations/definitions/filters/filter_popover';
import { IndexPattern, IndexPatternLayer } from '../types';

// to do: get the language from uiSettings
const defaultFilter: Query = {
  query: '',
  language: 'kuery',
};

export function setFilter(columnId: string, layer: IndexPatternLayer, query: Query) {
  return {
    ...layer,
    columns: {
      ...layer.columns,
      [columnId]: {
        ...layer.columns[columnId],
        filter: query.query !== '' ? query : undefined,
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
  if (!selectedOperation.filterable) {
    return null;
  }

  return (
    <EuiFormRow
      display="columnCompressed"
      fullWidth
      label={
        <EuiToolTip
          content={i18n.translate('xpack.lens.indexPattern.timeScale.tooltip', {
            defaultMessage:
              'Normalize values to be always shown as rate per specified time unit, regardless of the underlying date interval.',
          })}
        >
          <span>
            {i18n.translate('xpack.lens.indexPattern.timeScale.label', {
              defaultMessage: 'Filter by',
            })}{' '}
            <EuiIcon type="questionInCircle" color="subdued" size="s" className="eui-alignTop" />
          </span>
        </EuiToolTip>
      }
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
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFormRow>
  );
}
