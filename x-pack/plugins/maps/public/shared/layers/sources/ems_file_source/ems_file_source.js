/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AbstractVectorSource } from '../vector_source';
import React from 'react';
import { GIS_API_PATH } from '../../../../../common/constants';
import { emsServiceSettings } from '../../../../kibana_services';
import { getEmsVectorFilesMeta } from '../../../../meta';
import { EMSFileCreateSourceEditor } from './create_source_editor';

export class EMSFileSource extends AbstractVectorSource {

  static type = 'EMS_FILE';
  static title = 'Elastic Maps Service vector shapes';
  static description = 'Vector shapes of administrative boundaries from Elastic Maps Service';
  static icon = 'emsApp';

  static createDescriptor(id) {
    return {
      type: EMSFileSource.type,
      id: id
    };
  }

  static renderEditor({ onPreviewSource }) {
    const onChange = (selectedId) => {
      const emsFileSourceDescriptor = EMSFileSource.createDescriptor(selectedId);
      const emsFileSource = new EMSFileSource(emsFileSourceDescriptor);
      onPreviewSource(emsFileSource);
    };
    return <EMSFileCreateSourceEditor onChange={onChange}/>;
  }

  constructor(descriptor) {
    super(descriptor);
  }

  async _getEmsVectorFileMeta() {
    const emsFiles = await getEmsVectorFilesMeta();
    const meta = emsFiles.find((source => source.id === this._descriptor.id));
    if (!meta) {
      throw new Error(`Unable to find EMS vector shapes for id: ${this._descriptor.id}`);
    }
    return meta;
  }

  async getGeoJsonWithMeta() {
    const emsVectorFileMeta = await this._getEmsVectorFileMeta();
    const featureCollection = await AbstractVectorSource.getGeoJson({
      format: emsVectorFileMeta.format,
      featureCollectionPath: 'data',
      fetchUrl: `../${GIS_API_PATH}/data/ems?id=${encodeURIComponent(this._descriptor.id)}`
    });
    return {
      data: featureCollection,
      meta: {}
    };
  }

  async getImmutableProperties() {
    const emsLink = await emsServiceSettings.getEMSHotLink({ id: this._descriptor.id });
    return [
      { label: 'Data source', value: EMSFileSource.title },
      { label: 'Layer', value: this._descriptor.id, link: emsLink }
    ];
  }

  async getDisplayName() {
    try {
      const emsVectorFileMeta = await this._getEmsVectorFileMeta();
      return emsVectorFileMeta.name;
    } catch (error) {
      return this._descriptor.id;
    }
  }

  async getAttributions() {
    const emsVectorFileMeta = await this._getEmsVectorFileMeta();
    return emsVectorFileMeta.attributions;
  }


  async getStringFields() {
    const emsVectorFileMeta = await this._getEmsVectorFileMeta();
    return emsVectorFileMeta.fields.map(f => {
      return { name: f.name, label: f.description };
    });
  }

  canFormatFeatureProperties() {
    return true;
  }

}
