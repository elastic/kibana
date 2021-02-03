/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect } from 'react';
import { Dictionary } from '../../../../common/types/common';
import { LayerDescriptor } from '../../../../../maps/common/descriptor_types';
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
