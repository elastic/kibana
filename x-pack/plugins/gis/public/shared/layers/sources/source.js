/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import * as topojson from 'topojson-client';
import _ from 'lodash';

export class ASource {

  static renderEditor() {
    throw new Error('Must implement Source.renderEditor');
  }

  static createDescriptor() {
    throw new Error('Must implement Source.createDescriptor');
  }

  constructor(descriptor) {
    this._descriptor = descriptor;
  }

  renderDetails() {
    return (<div>{`Here be details for source`}</div>);
  }

  _createDefaultLayerDescriptor() {
    throw new Error(`Source#createDefaultLayerDescriptor not implemented`);
  }

  createDefaultLayer() {
    throw new Error(`Source#createDefaultLayer not implemented`);
  }

  getDisplayName() {
    console.warn('Source should implement Source#getDisplayName');
    return '';
  }
}

export class TMSSource extends ASource {
  getUrlTemplate() {
    throw new Error('Should implement TMSSource#getUrlTemplate');
  }
}

export class VectorSource extends ASource {

  async getNumberFieldNames() {
    console.warn('Should implement VectorSource#getNumberFields');
    return [];
  }

  async getGeoJson() {
    throw new Error('Should implement VectorSource#getGeoJson');
  }

  async _getGeoJson({ format, meta }, fetchUrl) {
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

  async isTimeAware() {
    throw new Error('Should implement');
  }

}
