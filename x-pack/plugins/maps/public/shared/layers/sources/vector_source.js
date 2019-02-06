/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { VectorLayer } from '../vector_layer';
import { VectorStyle } from '../styles/vector_style';
import { AbstractSource } from './source';
import * as topojson from 'topojson-client';
import _ from 'lodash';

export class AbstractVectorSource extends AbstractSource {

  static async getGeoJson({ format, featureCollectionPath, fetchUrl }) {
    let fetchedJson;
    try {
      const vectorFetch = await fetch(fetchUrl);
      fetchedJson = await vectorFetch.json();
    } catch (e) {
      throw new Error(`Unable to fetch vector shapes from url: ${fetchUrl}`);
    }

    if (format === 'geojson') {
      return fetchedJson;
    }

    if (format === 'topojson') {
      const features = _.get(fetchedJson, featureCollectionPath);
      return topojson.feature(fetchedJson, features);
    }

    throw new Error(`Unrecognized vector shape format: ${format}`);
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
    return false;
  }

  isBoundsAware() {
    return false;
  }

  async getBoundsForFilters() {
    console.warn('Should implement AbstractVectorSource#getBoundsForFilters');
    return null;
  }

  async getNumberFields() {
    return [];
  }

  async getStringFields() {
    return [];
  }

  async getGeoJsonWithMeta() {
    throw new Error('Should implement VectorSource#getGeoJson');
  }

  canFormatFeatureProperties() {
    return false;
  }

  // Allow source to filter and format feature properties before displaying to user
  async filterAndFormatProperties(properties) {
    //todo :this is quick hack... should revise (should model proeprties explicitly in vector_layer
    const props = {};
    for (const key in properties) {
      if (key.startsWith('__kbn')) {//these are system proeprties and should be ignored
        continue;
      }
      props[key] = properties[key];
    }
    return props;
  }

  async isTimeAware() {
    return false;
  }

}
