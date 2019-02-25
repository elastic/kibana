/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AbstractVectorSource } from '../vector_source';
import React from 'react';
import { GEOJSON_FILE } from '../../../../../common/constants';
import { ClientFileCreateSourceEditor } from './create_client_file_source_editor';

export class GeojsonFileSource extends AbstractVectorSource {

  static type = GEOJSON_FILE;
  static title = 'GeoJSON Vector File';
  static description = 'Client-provided GeoJSON vector shape file';
  static icon = 'emsApp';

  static createDescriptor(id) {
    return {
      type: GeojsonFileSource.type,
      id: id
    };
  }

  static renderEditor() {
    return <ClientFileCreateSourceEditor />;
  }

  async getDisplayName() {
    try {
      return 'Bill the vector file';
    } catch (error) {
      return this._descriptor.id;
    }
  }

  canFormatFeatureProperties() {
    return true;
  }

}
