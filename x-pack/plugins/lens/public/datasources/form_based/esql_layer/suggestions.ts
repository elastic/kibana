/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataType, TableChangeType } from '../../../types';
import { FormBasedPrivateState } from '../types';
import { TextBasedLayer, TextBasedLayerColumn } from './types';
import { canColumnBeUsedBeInMetricDimension, isNotNumeric, isNumeric } from './utils';

export const getUnchangedSuggestionTable = (
  state: FormBasedPrivateState,
  allColumns: TextBasedLayerColumn[],
  id: string
) => {
  return {
    state: {
      ...state,
    },
    table: {
      changeType: 'unchanged' as TableChangeType,
      isMultiRow: false,
      layerId: id,
      columns:
        (state.layers[id] as TextBasedLayer).columns?.map((f) => {
          const inMetricDimension = canColumnBeUsedBeInMetricDimension(allColumns, f?.meta?.type);
          return {
            columnId: f.columnId,
            operation: {
              dataType: f?.meta?.type as DataType,
              label: f.fieldName,
              isBucketed: Boolean(isNotNumeric(f)),
              // makes non-number fields to act as metrics, used for datatable suggestions
              ...(inMetricDimension && {
                inMetricDimension,
              }),
            },
          };
        }) ?? [],
    },
    keptLayerIds: [id],
  };
};

export const getSuggestionsByRules = (
  state: FormBasedPrivateState,
  allColumns: TextBasedLayerColumn[],
  id: string,
  rules: Array<{ isBucketed: boolean; allowAll?: boolean }>
) => {
  const layer = state.layers[id] as TextBasedLayer;
  const columnsToKeep = rules.reduce<TextBasedLayerColumn[]>((acc, rule) => {
    const fn = rule.isBucketed ? isNotNumeric : isNumeric;
    let column = layer.columns?.find(
      (col) => fn(col) && !acc.some((c) => c.columnId === col.columnId)
    );
    if (!column && rule.allowAll) {
      column = layer.columns?.find((col) => !acc.some((c) => c.columnId === col.columnId));
    }
    return column ? [...acc, column] : acc;
  }, []);

  if (!columnsToKeep.length || columnsToKeep.length !== rules.length) {
    return;
  }
  return {
    state: {
      ...state,
      layers: {
        [id]: {
          ...(state.layers[id] as TextBasedLayer),
          columns: columnsToKeep,
        },
      },
    },
    table: {
      changeType: 'reduced' as TableChangeType,
      isMultiRow: false,
      layerId: id,
      columns:
        columnsToKeep?.map((f, i) => {
          const inMetricDimension = canColumnBeUsedBeInMetricDimension(allColumns, f?.meta?.type);
          return {
            columnId: f.columnId,
            operation: {
              dataType: f?.meta?.type as DataType,
              label: f.fieldName,
              isBucketed: !!rules[i].isBucketed,
              // makes non-number fields to act as metrics, used for datatable suggestions
              ...(inMetricDimension && {
                inMetricDimension,
              }),
            },
          };
        }) ?? [],
    },
    keptLayerIds: [id],
  };
};
