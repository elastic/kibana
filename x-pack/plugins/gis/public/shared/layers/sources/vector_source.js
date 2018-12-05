/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { VectorLayer } from '../vector_layer';
import { VectorStyle } from '../styles/vector_style';
import { ASource } from './source';
import * as topojson from 'topojson-client';
import _ from 'lodash';

export class VectorSource extends ASource {

  static async getGeoJson({ format, meta }, fetchUrl) {
    let jsonFeatures;
    try {
      format = _.get(format, 'type', format); // Hacky workaround for differing config data structure
      const vectorFetch = await fetch(fetchUrl);
      const fetchedJson = await vectorFetch.json();

      if (format === 'geojson') {
        jsonFeatures = fetchedJson;
      } else if (format === 'topojson') {
        const featureCollectionPath = meta && meta.feature_collection_path
          && `objects.${meta.feature_collection_path}` || 'objects.data';
        const features = _.get(fetchedJson, featureCollectionPath);
        jsonFeatures = topojson.feature(fetchedJson, features);
      } else {
        //should never happen
        jsonFeatures = {};
        throw new Error(`Unrecognized format: ${format}`);
      }
    } catch (e) {
      console.error(e);
      throw e;
    }
    return jsonFeatures;
  }

  _createDefaultLayerDescriptor(options) {
    return VectorLayer.createDescriptor({
      sourceDescriptor: this._descriptor,
      ...options
    });
  }

  createDefaultLayer(options) {
    const layerDescriptor = this._createDefaultLayerDescriptor(options);
    const style = new VectorStyle(layerDescriptor.style);
    return new VectorLayer({
      layerDescriptor: layerDescriptor,
      source: this,
      style: style
    });
  }

  isFilterByMapBounds() {
    console.warn('Should implement VectorSource#isFilterByMapBounds');
    return false;
  }

  async getNumberFields() {
    console.warn('Should implement VectorSource#getNumberFields');
    return [];
  }

  async getStringFields() {
    console.warn('Should implement VectorSource@getStringFields');
    return [];
  }

  async getGeoJsonWithMeta() {
    throw new Error('Should implement VectorSource#getGeoJson');
  }

  areFeatureTooltipsEnabled() {
    return false;
  }

  // Allow source to filter and format feature properties before displaying to user
  async filterAndFormatProperties(properties) {
    return properties;
  }

  async isTimeAware() {
    throw new Error('Should implement');
  }

}
