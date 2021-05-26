/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';
import { SavedObjectUnsanitizedDoc } from '../../../../../src/core/server';
import { LensDocShapePre712, OperationTypePre712, LensDocShapePost712 } from './types';

export const commonRenameOperationsForFormula = (doc: {
  attributes: LensDocShapePre712;
}): { attributes: LensDocShapePost712 } => {
  const renameMapping = {
    avg: 'average',
    cardinality: 'unique_count',
    derivative: 'differences',
  } as const;
  function shouldBeRenamed(op: OperationTypePre712): op is keyof typeof renameMapping {
    return op in renameMapping;
  }
  const newDoc = cloneDeep(doc);
  const datasourceLayers = newDoc.attributes.state.datasourceStates.indexpattern.layers || {};
  (newDoc.attributes as LensDocShapePost712).state.datasourceStates.indexpattern.layers = Object.fromEntries(
    Object.entries(datasourceLayers).map(([layerId, layer]) => {
      return [
        layerId,
        {
          ...layer,
          columns: Object.fromEntries(
            Object.entries(layer.columns).map(([columnId, column]) => {
              const copy = {
                ...column,
                operationType: shouldBeRenamed(column.operationType)
                  ? renameMapping[column.operationType]
                  : column.operationType,
              };
              return [columnId, copy];
            })
          ),
        },
      ];
    })
  );
  return newDoc as SavedObjectUnsanitizedDoc<LensDocShapePost712>;
};
