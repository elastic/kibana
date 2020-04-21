/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { cloneDeep } from 'lodash';
import { SavedObjectMigrationFn } from 'src/core/server';

interface XYLayerPre77 {
  layerId: string;
  xAccessor: string;
  splitAccessor: string;
  accessors: string[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const migrations: Record<string, SavedObjectMigrationFn<any, any>> = {
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
};
