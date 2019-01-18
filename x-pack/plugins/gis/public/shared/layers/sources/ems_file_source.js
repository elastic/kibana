/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { VectorSource } from './vector_source';
import React from 'react';
import {
  EuiLink,
  EuiText,
  EuiSelect,
  EuiFormRow,
} from '@elastic/eui';

import { GIS_API_PATH } from '../../../../common/constants';
import { emsServiceSettings } from '../../../kibana_services';

export class EMSFileSource extends VectorSource {

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
    const fetchUrl = `../${GIS_API_PATH}/data/ems?id=${encodeURIComponent(this._descriptor.id)}`;
    const featureCollection = await VectorSource.getGeoJson(fileSource, fetchUrl);
    return {
      data: featureCollection,
      meta: {}
    };
  }

  renderDetails() {
    const emsHotLink = emsServiceSettings.getEMSHotLink(this._descriptor.id);
    return (
      <EuiText color="subdued" size="s">
        <p className="gisLayerDetails">
          <strong className="gisLayerDetails__label">Source </strong><span>Elastic Maps Service</span><br/>
          <strong className="gisLayerDetails__label">Id </strong><span>{this._descriptor.id}</span><br/>
          <EuiLink href={emsHotLink} target="_blank">Preview on maps.elastic.co</EuiLink><br/>
        </p>
      </EuiText>
    );
  }

  async getDisplayName() {
    const fileSource = this._emsFiles.find((source => source.id === this._descriptor.id));
    return fileSource.name;
  }

  async getAttributions() {
    const fileSource = this._emsFiles.find((source => source.id === this._descriptor.id));
    return fileSource.attributions;
  }


  async getStringFields() {
    //todo: use map/service-settings instead.
    const fileSource = this._emsFiles.find((source => source.id === this._descriptor.id));

    return fileSource.fields.map(f => {
      return { name: f.name, label: f.description };
    });

  }

  canFormatFeatureProperties() {
    return true;
  }

}
