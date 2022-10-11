/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback } from 'react';
import { isEqual } from 'lodash';
import type { Query } from '@kbn/es-query';
import { GenericIndexPatternColumn, operationDefinitionMap } from '../operations';
import type { IndexPatternLayer } from '../types';
import { validateQuery, FilterQueryInput } from '../../shared_components';
import type { IndexPattern } from '../../types';

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
  helpMessage,
}: {
  selectedColumn: GenericIndexPatternColumn;
  indexPattern: IndexPattern;
  columnId: string;
  layer: IndexPatternLayer;
  updateLayer: (newLayer: IndexPatternLayer) => void;
  helpMessage: string | null;
}) {
  const inputFilter = selectedColumn.filter;
  const onChange = useCallback(
    (query) => {
      const { isValid } = validateQuery(query, indexPattern);
      if (isValid && !isEqual(inputFilter, query)) {
        updateLayer(setFilter(columnId, layer, query));
      }
    },
    [columnId, indexPattern, inputFilter, layer, updateLayer]
  );

  const selectedOperation = operationDefinitionMap[selectedColumn.operationType];

  if (!selectedOperation.filterable) {
    return null;
  }

  return (
    <FilterQueryInput
      helpMessage={helpMessage}
      onChange={onChange}
      indexPattern={indexPattern}
      inputFilter={inputFilter}
    />
  );
}
