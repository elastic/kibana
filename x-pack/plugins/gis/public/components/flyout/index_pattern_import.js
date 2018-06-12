/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  EuiSelect,
  EuiSpacer,
  EuiRadio
} from '@elastic/eui';
import * as util from '../util';

const GEO_LAYERS_URL = `http://layers.url.tbd`;

export default class IndexPatternImport extends React.Component {

  constructor(props) {
    super(props);

    this._onPreviewLayer = props.onPreviewLayer;
    this._geoShapeSelect = undefined;
    this._geoPointSelect = undefined;

    this.state = {
      geoPointLayers: [],
      geoShapeLayers: [],
      radioIdSelected: 'geoPointRadio'
    };

    this._onRadioChange = (e) => {
      this.setState({ radioIdSelected: e.target.id });

      if (e.target.id === 'geoPointRadio') {
        this.onGeoPointSelect(this._geoPointSelect);
      } else if (e.target.id === 'geoShapeRadio') {
        this.onGeoShapeSelect(this._geoShapeSelect);
      }
    };

    this.onGeoShapeSelect = (e) => {
      const select = e.target || e;
      const index = select.selectedIndex - 1;

      if (index < 0) {
        this._onPreviewLayer(undefined);
        return;
      }

      const selection = this.state.geoShapeLayers[index]._option;
      const importedUrl = `${GEO_LAYERS_URL}?index=${selection.index}&geometry_path=${"geometry"}&size=${10000}&type=${selection.type}`;
      this._onPreviewLayer({
        type: 'vector',
        url: importedUrl,
        display: selection.display,
        dataId: selection.index,
        source: {
          type: 'es',
          index: selection.index,
          index_type: selection.type,
          geometry_path: "geometry"
        }
      });
    };

    this.onGeoPointSelect = (e) => {
      const select = e.target || e;
      const index = select.selectedIndex - 1;

      if (index < 0) {
        this._onPreviewLayer(undefined);
        return;
      }

      const selection = this.state.geoPointLayers[index]._option;
      this._onPreviewLayer({
        type: "heatmap",
        index: selection.index,
        doc_type: selection.type,
        field: selection.fields[0].name,
        display: selection.display,
      });
    };

  }

  componentDidMount() {
    this._fetchState();
  }

  async _fetchState() {
    const newGeoPointOptions = await this._fetchGeoPointState();
    const newGeoShapeOptions = await this._fetchGeoShapeState();
    this.setState({
      geoPointLayers: newGeoPointOptions,
      geoShapeLayers: newGeoShapeOptions
    });
  }

  async _fetchGeoPointState() {
    const optionsWithFields = await util.getAvailableLayerForField('geo_point');
    const options = optionsWithFields.map(option => {
      return ({
        value: option.id,
        text: option.display,
        _option: option
      });
    });
    return options;
  }

  async _fetchGeoShapeState() {
    const optionsWithFields = await util.getAvailableLayerForField('geo_shape');
    const options = optionsWithFields.map(option => {
      return ({
        value: option.id,
        text: option.display,
        _option: option
      });
    });
    return options;
  }

  render() {
    return (
      <div>
        <EuiRadio
          id="geoPointRadio"
          name="indexPatternRadio"
          label="Geohash grid"
          checked={this.state.radioIdSelected === 'geoPointRadio'}
          onChange={this._onRadioChange}
        />

        <EuiSpacer size="s"/>

        <EuiSelect
          options={this.state.geoPointLayers}
          disabled={this.state.radioIdSelected !== 'geoPointRadio'}
          onChange={this.onGeoPointSelect}
          inputRef={(select) => {
            this._geoPointSelect = select;
          }}
          hasNoInitialSelection
        />

        <EuiSpacer size="xl"/>

        <EuiRadio
          id="geoShapeRadio"
          name="indexPatternRadio"
          label="Documents"
          checked={this.state.radioIdSelected === 'geoShapeRadio'}
          onChange={this._onRadioChange}
        />

        <EuiSpacer size="s"/>

        <EuiSelect
          options={this.state.geoShapeLayers}
          disabled={this.state.radioIdSelected !== 'geoShapeRadio'}
          onChange={this.onGeoShapeSelect}
          inputRef={(select) => {
            this._geoShapeSelect = select;
          }}
          hasNoInitialSelection
        />
      </div>
    );
  }
}
