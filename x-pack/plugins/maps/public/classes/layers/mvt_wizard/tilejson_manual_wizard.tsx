/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import { TiledSingleLayerVectorSourceSettings } from '../../../../common/descriptor_types';
import { MVTSingleLayerVectorSource } from '../../sources/mvt_single_layer_vector_source';
import { TiledVectorLayer } from '../tiled_vector_layer/tiled_vector_layer';
import { MVTSingleLayerVectorSourceEditor } from '../../sources/mvt_single_layer_vector_source/mvt_single_layer_vector_source_editor';
import { SOURCE_TYPES } from '../../../../common/constants';

interface State {
  sourceType: SOURCE_TYPES.MVT_SINGLE_LAYER | SOURCE_TYPES.TILEJSON_SINGLE_LAYER;
}
interface Props {
  previewLayers: () => {};
}

// eslint-disable-next-line react/prefer-stateless-function
export class TileJsonManualWizard extends Component<Props, State> {
  render() {
    const onSourceConfigChange = (sourceConfig: TiledSingleLayerVectorSourceSettings) => {
      const sourceDescriptor = MVTSingleLayerVectorSource.createDescriptor(sourceConfig);
      const layerDescriptor = TiledVectorLayer.createDescriptor({ sourceDescriptor }, mapColors);
      this.props.previewLayers([layerDescriptor]);
    };

    return <MVTSingleLayerVectorSourceEditor onSourceConfigChange={onSourceConfigChange} />;
  }
}
