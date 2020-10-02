/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import { EuiSwitch, EuiPanel, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  TiledSingleLayerVectorSourceSettings,
  TileJsonVectorSourceDescriptor,
  TileJsonVectorSourceSettings,
} from '../../../../common/descriptor_types';
import { MVTSingleLayerVectorSource } from '../../sources/mvt_single_layer_vector_source';
import { TiledVectorLayer } from '../tiled_vector_layer/tiled_vector_layer';
import { MVTSingleLayerVectorSourceEditor } from '../../sources/mvt_single_layer_vector_source/mvt_single_layer_vector_source_editor';
import { SOURCE_TYPES } from '../../../../common/constants';
import { TileJsonSourceEditor } from '../../sources/tilejson_source/tilejson_source_editor';
import { TileJsonSource } from '../../sources/tilejson_source/tilejson_source';

interface State {
  useTileJsonConfig: boolean;
}
interface Props {
  previewLayers: () => {};
  mapColors: any;
}

export class TileJsonManualWizard extends Component<Props, State> {
  state: State = {
    useTileJsonConfig: true,
  };

  onEditorChange = (e) => {
    if (this.state.useTileJsonConfig !== e.target.checked) {
      this.setState({ useTileJsonConfig: e.target.checked });
    }
  };

  _renderEditor() {
    if (this.state.useTileJsonConfig) {
      const onSourceConfigChange = (sourceConfig: TileJsonVectorSourceSettings) => {
        const sourceDescriptor: TileJsonVectorSourceDescriptor = TileJsonSource.createDescriptor(
          sourceConfig
        );
        const layerDescriptor = TiledVectorLayer.createDescriptor(
          { sourceDescriptor },
          this.props.mapColors
        );
        this.props.previewLayers([layerDescriptor]);
      };
      return <TileJsonSourceEditor onSourceConfigChange={onSourceConfigChange} />;
    } else {
      const onSourceConfigChange = (sourceConfig: TiledSingleLayerVectorSourceSettings) => {
        const sourceDescriptor = MVTSingleLayerVectorSource.createDescriptor(sourceConfig);
        const layerDescriptor = TiledVectorLayer.createDescriptor(
          { sourceDescriptor },
          this.props.mapColors
        );
        this.props.previewLayers([layerDescriptor]);
      };
      return <MVTSingleLayerVectorSourceEditor onSourceConfigChange={onSourceConfigChange} />;
    }
  }

  render() {
    return (
      <EuiPanel>
        <EuiSwitch
          label={i18n.translate('xpack.maps.source.mvtWizard.switchMessageFalse', {
            defaultMessage: 'Use TileJson',
          })}
          onChange={this.onEditorChange}
          checked={this.state.useTileJsonConfig}
        />
        <EuiSpacer size={'s'} />
        {this._renderEditor()}
      </EuiPanel>
    );
  }
}
