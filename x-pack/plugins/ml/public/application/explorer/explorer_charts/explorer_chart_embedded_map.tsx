/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import { LayerDescriptor } from '@kbn/maps-plugin/common';
import { Dictionary } from '../../../../common/types/common';
import { getMLAnomaliesActualLayer, getMLAnomaliesTypicalLayer } from './map_config';
import { MlEmbeddedMapComponent } from '../../components/ml_embedded_map';
interface Props {
  seriesConfig: Dictionary<any>;
}

export function EmbeddedMapComponentWrapper({ seriesConfig }: Props) {
  const [layerList, setLayerList] = useState<LayerDescriptor[]>([]);

  useEffect(() => {
    if (seriesConfig.mapData && seriesConfig.mapData.length > 0) {
      setLayerList([
        getMLAnomaliesActualLayer(seriesConfig.mapData),
        getMLAnomaliesTypicalLayer(seriesConfig.mapData),
      ]);
    }
  }, [seriesConfig]);

  return (
    <div data-test-subj="xpack.ml.explorer.embeddedMap" style={{ width: '100%', height: 300 }}>
      <MlEmbeddedMapComponent layerList={layerList} />
    </div>
  );
}
