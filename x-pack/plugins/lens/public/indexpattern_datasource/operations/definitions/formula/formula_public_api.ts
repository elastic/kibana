/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndexPattern } from '../../../types';
import type { DataView } from '../../../../../../../../src/plugins/data_views/public';

import { insertOrReplaceFormulaColumn } from '.';
import { operationDefinitionMap } from '../../operations';
import { convertDataViewIntoLensIndexPattern } from '../../../loader';
import { PersistedIndexPatternLayer } from '../../../types';

/** @public **/
export interface FormulaPublicApi {
  /**
   * Method which Lens consumer can import and given a formula string,
   * return a parsed result as list of columns to use as Embeddable attributes.
   *
   * @param id - Formula column id
   * @param column.formula - String representation of a formula
   * @param [column.label] - Custom formula label
   * @param layer - The layer to which the formula columns will be added
   * @param dataView - The dataView instance
   * @param [params.operations] - Use this parameter only if you need to filter available operations in the formula.
   *
   * See `x-pack/examples/embedded_lens_example` for exemplary usage.
   */
  insertOrReplaceFormulaColumn: (
    id: string,
    column: {
      formula: string;
      label?: string;
    },
    layer: PersistedIndexPatternLayer,
    dataView: DataView,
    params?: { operations?: string[] }
  ) => PersistedIndexPatternLayer | undefined;
}

/** @public **/
export const createFormulaPublicApi = (): FormulaPublicApi => {
  const cache: Map<string, IndexPattern> = new Map();

  const getCachedLensIndexPattern = (dataView: DataView): IndexPattern => {
    if (dataView.id) {
      const cachedIndexPattern = cache.get(dataView.id);
      if (cachedIndexPattern) {
        return cachedIndexPattern;
      }
    }
    const indexPattern = convertDataViewIntoLensIndexPattern(dataView);
    if (indexPattern.id) {
      cache.set(indexPattern.id, indexPattern);
    }
    return indexPattern;
  };

  return {
    insertOrReplaceFormulaColumn: (id, { formula, label }, layer, dataView, params) => {
      const indexPattern = getCachedLensIndexPattern(dataView);

      return insertOrReplaceFormulaColumn(
        id,
        {
          label: label ?? formula,
          customLabel: Boolean(label),
          operationType: 'formula',
          dataType: 'number',
          references: [],
          isBucketed: false,
          params: {
            formula,
          },
        },
        { ...layer, indexPatternId: indexPattern.id },
        {
          indexPattern,
          operations:
            params?.operations?.reduce(
              (operationsMap, item) => ({
                ...operationsMap,
                [item]: operationDefinitionMap[item],
              }),
              {}
            ) ?? undefined,
        }
      ).layer;
    },
  };
};
