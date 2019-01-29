/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AbstractVectorSource } from '../vector_source';
import React from 'react';
import { GIS_API_PATH } from '../../../../../common/constants';
import { emsServiceSettings } from '../../../../kibana_services';
import { getEmsFiles } from '../../../../meta';
import { EMSFileCreateSourceEditor } from './ems_file_source_source_editor';

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
    const onChange = ({ target }) => {
      const selectedId = target.options[target.selectedIndex].value;
      const emsFileSourceDescriptor = EMSFileSource.createDescriptor(selectedId);
      const emsFileSource = new EMSFileSource(emsFileSourceDescriptor);
      onPreviewSource(emsFileSource);
    };
    return <EMSFileCreateSourceEditor onChange={onChange}/>;
  }

  constructor(descriptor) {
    super(descriptor);
  }

  async getGeoJsonWithMeta() {
    const emsFiles = await getEmsFiles();
    const fileSource = emsFiles.find((source => source.id === this._descriptor.id));
    const fetchUrl = `../${GIS_API_PATH}/data/ems?id=${encodeURIComponent(this._descriptor.id)}`;
    const featureCollection = await AbstractVectorSource.getGeoJson(fileSource, fetchUrl);
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
    const emsFiles = await getEmsFiles();
    const fileSource = emsFiles.find((source => source.id === this._descriptor.id));
    return fileSource.name;
  }

  async getAttributions() {
    const emsFiles = await getEmsFiles();
    const fileSource = emsFiles.find((source => source.id === this._descriptor.id));
    return fileSource.attributions;
  }


  async getStringFields() {
    const emsFiles = await getEmsFiles();
    const fileSource = emsFiles.find((source => source.id === this._descriptor.id));
    return fileSource.fields.map(f => {
      return { name: f.name, label: f.description };
    });
  }

  canFormatFeatureProperties() {
    return true;
  }

}
