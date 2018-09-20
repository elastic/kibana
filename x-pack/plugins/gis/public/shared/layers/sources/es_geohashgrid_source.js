/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';

import {
  EuiButton,
  EuiSelect
} from '@elastic/eui';

import { ASource } from './source';
import { GeohashGridLayer } from '../geohashgrid_layer';
import { GIS_API_PATH } from '../../../../common/constants';

export class ESGeohashGridSource extends ASource {

  static type = 'ES_GEOHASH_GRID';

  static createDescriptor({ esIndexPattern, pointField }) {
    return {
      type: ESGeohashGridSource.type,
      esIndexPattern: esIndexPattern,
      pointField: pointField
    };
  }

  static renderEditor({ onPreviewSource, dataSourcesMeta }) {
    const indexPatterns = dataSourcesMeta.elasticsearch.indexPatterns.filter(indexPattern => indexPattern.isGeohashable);
    const onSelect = (selection) => {
      const sourceDescriptor = ESGeohashGridSource.createDescriptor({
        esIndexPattern: selection.esIndexPattern,
        pointField: selection.pointField
      });
      const source = new ESGeohashGridSource(sourceDescriptor);
      onPreviewSource(source);
    };

    return (<GeohashableIndexPatternEditor indexPatterns={indexPatterns} onSelect={onSelect}/>);
  }

  renderDetails() {
    return (
      <Fragment>
        <div>
          <span className="bold">Type: </span><span>Geohash grid (todo, use icon)</span>
        </div>
        <div>
          <span className="bold">Index pattern: </span><span>{this._descriptor.esIndexPattern}</span>
        </div>
        <div>
          <span className="bold">Point field: </span><span>{this._descriptor.pointField}</span>
        </div>
      </Fragment>
    );
  }

  async getGeoJsonPointsWithTotalCount(precision, extent) {
    try {
      let url = `../${GIS_API_PATH}/data/geohash_grid`;
      url += `?index_pattern=${encodeURIComponent(this._descriptor.esIndexPattern)}`;
      url += `&geo_point_field=${encodeURIComponent(this._descriptor.pointField)}`;
      url += `&precision=${precision}`;
      url += `&minlon=${extent[0]}`;
      url += `&maxlon=${extent[2]}`;
      url += `&minlat=${extent[1]}`;
      url += `&maxlat=${extent[3]}`;
      const data = await fetch(url);
      return data.json();
    } catch (e) {
      console.error('Cant load data', e);
      return { type: 'FeatureCollection', features: [] };
    }
  }

  _createDefaultLayerDescriptor(options) {
    return GeohashGridLayer.createDescriptor({
      sourceDescriptor: this._descriptor,
      ...options
    });
  }

  createDefaultLayer(options) {
    return new GeohashGridLayer({
      layerDescriptor: this._createDefaultLayerDescriptor(options),
      source: this
    });
  }

  getDisplayName() {
    return this._descriptor.esIndexPattern + ' grid';
  }


}

class GeohashableIndexPatternEditor extends React.Component {

  constructor() {
    super();
    this.state = {
      selectedIndexPattern: null,
      selectedPointField: null
    };
    this._pointFieldSelect = null;
  }

  _getSelectedIndexPattern() {
    return this.props.indexPatterns.find(indexPattern => indexPattern.id === this.state.selectedIndexPattern);
  }

  _getPointFields() {
    const indexPattern = this._getSelectedIndexPattern();
    return indexPattern.fields.filter(field => field.type === 'geo_point');
  }

  render() {

    const indexPatterns = this.props.indexPatterns.map((indexPattern) => {
      return {
        value: indexPattern.id,
        text: indexPattern.title
      };
    });
    let pointOptions;
    if (this.state.selectedIndexPattern) {
      const pointFields = this._getPointFields();
      pointOptions = pointFields.map(field => {
        return {
          text: field.name,
          value: field.name
        };
      });
    } else {
      pointOptions = [];
    }

    const onIndexPatternChange = (e) => {
      this.setState({
        selectedIndexPattern: e.target.value,
        selectedPointField: null
      });
    };
    const onPointFieldChange = (e) => {
      this.setState({
        selectedPointField: e.target.value
      });
    };


    let geoFieldSelect;
    if (this.state.selectedIndexPattern) {
      geoFieldSelect = (
        <EuiSelect
          options={pointOptions}
          aria-label="Select geo_point field"
          onChange={onPointFieldChange}
        />
      );
    }

    return (
      <Fragment>
        <EuiSelect
          hasNoInitialSelection
          options={indexPatterns}
          onChange={onIndexPatternChange}
          aria-label="Select index-pattern"
        />
        {geoFieldSelect}
        <EuiButton
          size="s"
          onClick={() => {
            if (!this.state.selectedIndexPattern) {
              return;
            }
            const indexPattern = this._getSelectedIndexPattern();
            let pointField;
            if (this.state.selectedPointField) {
              pointField = this.state.selectedPointField;
            } else {
              const pointFields = this._getPointFields();
              pointField = pointFields[0].name;
            }
            this.props.onSelect({
              esIndexPattern: indexPattern.title,
              pointField: pointField
            });
          }}
          isDisabled={!this.state.selectedIndexPattern}
        >
          Preview geohash layer
        </EuiButton>
      </Fragment>
    );
  }


}
