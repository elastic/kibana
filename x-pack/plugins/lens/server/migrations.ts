/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { cloneDeep, flow } from 'lodash';
import { fromExpression, toExpression } from '@kbn/interpreter/common';
import { SavedObjectMigrationFn, SavedObjectUnsanitizedDoc } from 'src/core/server';

interface XYLayerPre77 {
  layerId: string;
  xAccessor: string;
  splitAccessor: string;
  accessors: string[];
}

function removeLensAutoDate(doc: SavedObjectUnsanitizedDoc) {
  const expression: string = doc.attributes?.expression;
  const ast = fromExpression(expression);

  // TODO: Magic AST manipulation
  // esaggs aggConfigs={lens_auto_date aggConfigs='[{}, {}]'}
  // ->
  // esaggs aggConfigs='[{}, {}]'

  return {
    ...doc,
    attributes: {
      ...doc.attributes,
      expression: toExpression(ast),
    },
  };
}

function addTimeFieldToEsaggs(doc: SavedObjectUnsanitizedDoc) {
  const expression: string = doc.attributes?.expression;
  const ast = fromExpression(expression);

  // TODO: Magiv AST manipulation
  // esaggs aggConfigs='[{id, type: 'date_histogram', params: { field: 'timestamp' }}, ... ]'
  // ->
  // esaggs timeField='timestamp' timeField='another_date_field' aggConfigs='[the same as before]'

  return {
    ...doc,
    attributes: {
      ...doc.attributes,
      expression: toExpression(ast),
    },
  };
}

export const migrations: Record<string, SavedObjectMigrationFn> = {
  '7.7.0': doc => {
    const newDoc = cloneDeep(doc);
    if (newDoc.attributes?.visualizationType === 'lnsXY') {
      const datasourceState = newDoc.attributes.state?.datasourceStates?.indexpattern;
      const datasourceLayers = datasourceState?.layers ?? {};
      const xyState = newDoc.attributes.state?.visualization;
      newDoc.attributes.state.visualization.layers = xyState.layers.map((layer: XYLayerPre77) => {
        const layerId = layer.layerId;
        const datasource = datasourceLayers[layerId];
        return {
          ...layer,
          xAccessor: datasource?.columns[layer.xAccessor] ? layer.xAccessor : undefined,
          splitAccessor: datasource?.columns[layer.splitAccessor] ? layer.splitAccessor : undefined,
          accessors: layer.accessors.filter(accessor => !!datasource?.columns[accessor]),
        };
      }) as typeof xyState.layers;
    }
    return newDoc;
  },
  // The order of these migrations matter, since the timefield migration relies on the aggConfigs
  // sitting directly on the esaggs as an argument and not a nested function (which lens_auto_date was).
  '7.8.0': flow(removeLensAutoDate, addTimeFieldToEsaggs),
};
