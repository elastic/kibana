/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback } from 'react';
import { isEqual } from 'lodash';
import type { Query } from '@kbn/es-query';
import { validateQuery, FilterQueryInput } from '@kbn/visualization-ui-components';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { LENS_APP_NAME } from '../../../../common/constants';
import { GenericIndexPatternColumn, operationDefinitionMap } from '../operations';
import type { FormBasedLayer } from '../types';
import type { IndexPattern } from '../../../types';
import { LensAppServices } from '../../../app_plugin/types';

export function setFilter(columnId: string, layer: FormBasedLayer, query: Query | undefined) {
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
  layer: FormBasedLayer;
  updateLayer: (newLayer: FormBasedLayer) => void;
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

  const lensServices = useKibana<LensAppServices>().services;

  const selectedOperation = operationDefinitionMap[selectedColumn.operationType];

  if (!selectedOperation.filterable) {
    return null;
  }

  return (
    <FilterQueryInput
      helpMessage={helpMessage}
      onChange={onChange}
      dataView={indexPattern}
      inputFilter={inputFilter}
      queryInputServices={lensServices}
      appName={LENS_APP_NAME}
    />
  );
}
