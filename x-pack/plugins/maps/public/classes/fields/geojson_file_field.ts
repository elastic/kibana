/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FIELD_ORIGIN } from '../../../common/constants';
import { IField, AbstractField } from './field';
import { IVectorSource } from '../sources/vector_source';
import { GeoJsonFileSource } from '../sources/geojson_file_source';

export class GeoJsonFileField extends AbstractField implements IField {
  private readonly _source: GeoJsonFileSource;
  private readonly _dataType: string;

  constructor({
    fieldName,
    source,
    origin,
    dataType,
  }: {
    fieldName: string;
    source: GeoJsonFileSource;
    origin: FIELD_ORIGIN;
    dataType: string;
  }) {
    super({ fieldName, origin });
    this._source = source;
    this._dataType = dataType;
  }

  getSource(): IVectorSource {
    return this._source;
  }

  async getLabel(): Promise<string> {
    return this.getName();
  }

  async getDataType(): Promise<string> {
    return this._dataType;
  }
}
