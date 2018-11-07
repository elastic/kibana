/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { VectorSource } from './source';
import React from 'react';
import {
  EuiLink,
  EuiText,
  EuiSelect,
  EuiFormRow
} from '@elastic/eui';

import { GIS_API_PATH } from '../../../../common/constants';
import { emsServiceSettings } from '../../../kibana_services';

export class EMSFileSource extends VectorSource {

  static type = 'EMS_FILE';
  static typeDisplayName = 'Elastic Maps Service region boundaries';

  static createDescriptor(name) {
    return {
      type: EMSFileSource.type,
      name: name
    };
  }

  static renderEditor({ dataSourcesMeta, onPreviewSource }) {

    const emsVectorOptionsRaw = (dataSourcesMeta) ? dataSourcesMeta.ems.file : [];
    const emsVectorOptions = emsVectorOptionsRaw ? emsVectorOptionsRaw.map((file) => ({
      value: file.name,
      text: file.name
    })) : [];

    const onChange = ({ target }) => {
      const selectedName = target.options[target.selectedIndex].text;
      const emsFileSourceDescriptor = EMSFileSource.createDescriptor(selectedName);
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

  constructor(descriptor, emsFiles) {
    super(descriptor);
    this._emsFiles = emsFiles;
  }

  async getGeoJson() {
    const fileSource = this._emsFiles.find((source => source.name === this._descriptor.name));
    const fetchUrl = `../${GIS_API_PATH}/data/ems?name=${encodeURIComponent(this._descriptor.name)}`;
    const featureCollection = await VectorSource.getGeoJson(fileSource, fetchUrl);
    return {
      data: featureCollection,
      meta: {}
    };
  }

  renderDetails() {
    const emsHotLink = emsServiceSettings.getEMSHotLinkByName(this._descriptor.name);
    return (
      <EuiText color="subdued" size="s">
        <p className="gisLayerDetails">
          <strong className="gisLayerDetails__label">Source:</strong><span>Elastic Maps Service</span><br/>
          <strong className="gisLayerDetails__label">Name:</strong><span>{this._descriptor.name}</span><br/>
          <EuiLink href={emsHotLink} target="_blank">Preview on landing page</EuiLink><br/>
        </p>
      </EuiText>
    );
  }

  async getDisplayName() {
    return this._descriptor.name;
  }

  async getStringFields() {
    //todo: use map/service-settings instead.
    const fileSource = this._emsFiles.find((source => source.name === this._descriptor.name));

    return fileSource.fields.map(f => {
      return { name: f.name, label: f.description };
    });

  }

  async isTimeAware() {
    return false;
  }

}
