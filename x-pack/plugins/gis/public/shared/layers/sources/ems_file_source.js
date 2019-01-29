/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AbstractVectorSource } from './vector_source';
import React from 'react';
import {
  EuiSelect,
  EuiFormRow,
} from '@elastic/eui';

import { GIS_API_PATH } from '../../../../common/constants';
import { emsServiceSettings } from '../../../kibana_services';

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

  static renderEditor({ dataSourcesMeta, onPreviewSource }) {

    const emsVectorOptionsRaw = (dataSourcesMeta) ? dataSourcesMeta.ems.file : [];
    const emsVectorOptions = emsVectorOptionsRaw ? emsVectorOptionsRaw.map((file) => ({
      value: file.id,
      text: file.name
    })) : [];

    const onChange = ({ target }) => {
      const selectedId = target.options[target.selectedIndex].value;
      const emsFileSourceDescriptor = EMSFileSource.createDescriptor(selectedId);
      const emsFileSource = new EMSFileSource(emsFileSourceDescriptor, emsVectorOptionsRaw);
      onPreviewSource(emsFileSource);
    };
    return (
      <EuiFormRow label="Layer">
        <EuiSelect
          hasNoInitialSelection
          options={emsVectorOptions}
          onChange={onChange}
        />
      </EuiFormRow>
    );
  }

  constructor(descriptor, { emsFileLayers }) {
    super(descriptor);
    this._emsFiles = emsFileLayers;
  }

  async getGeoJsonWithMeta() {
    const fileSource = this._emsFiles.find((source => source.id === this._descriptor.id));
    if (!fileSource) {
      throw new Error(`Unable to find EMS vector shapes for id: ${this._descriptor.id}`);
    }
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
    const fileSource = this._emsFiles.find((source => source.id === this._descriptor.id));
    if (!fileSource) {
      return this._descriptor.id;
    }
    return fileSource.name;
  }

  async getAttributions() {
    const fileSource = this._emsFiles.find((source => source.id === this._descriptor.id));
    if (!fileSource) {
      return '';
    }
    return fileSource.attributions;
  }


  async getStringFields() {
    //todo: use map/service-settings instead.
    const fileSource = this._emsFiles.find((source => source.id === this._descriptor.id));

    if (!fileSource) {
      return [];
    }

    return fileSource.fields.map(f => {
      return { name: f.name, label: f.description };
    });

  }

  canFormatFeatureProperties() {
    return true;
  }

}
