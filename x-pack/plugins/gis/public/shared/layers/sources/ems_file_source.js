/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { VectorSource } from './source';
import React, { Fragment } from 'react';
import {
  EuiText,
  EuiSelect,
  EuiSpacer
} from '@elastic/eui';
import { GIS_API_PATH } from '../../../../common/constants';

export class EMSFileSource extends VectorSource {

  static type = 'EMS_FILE';
  static typeDisplayName = 'EMS';

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
      <EuiText>
        <Fragment>
          <EuiSpacer size="m"/>
          <EuiSelect
            hasNoInitialSelection
            options={emsVectorOptions}
            onChange={onChange}
            aria-label="Use aria labels when no actual label is in use"
          />
        </Fragment>
      </EuiText>
    );
  }

  constructor(descriptor, emsFiles) {
    super(descriptor);
    this._emsFiles = emsFiles;
  }

  async getGeoJson() {
    const fileSource = this._emsFiles.find((source => source.name === this._descriptor.name));
    const fetchUrl = `../${GIS_API_PATH}/data/ems?name=${encodeURIComponent(this._descriptor.name)}`;
    return VectorSource.getGeoJson(fileSource, fetchUrl);
  }

  renderDetails() {
    return (
      <Fragment>
        <div>
          <span className="bold">Source: </span><span>Elastic Maps Service</span>
        </div>
        <div>
          <span className="bold">Type: </span><span>Vector</span>
        </div>
        <div>
          <span className="bold">Name: </span><span>{this._descriptor.name}</span>
        </div>
        {/*<div>*/}
          {/*<span className="bold">todo hotlink to EMS landing page</span>*/}
        {/*</div>*/}
      </Fragment>
    );
  }

  async getDisplayName() {
    return this._descriptor.name;
  }

  async getStringFields() {
    const fileSource = this._emsFiles.find((source => source.name === this._descriptor.name));

    return fileSource.fields.map(f => {
      return { name: f.name, label: f.description };
    });

  }

  async isTimeAware() {
    return false;
  }

}
