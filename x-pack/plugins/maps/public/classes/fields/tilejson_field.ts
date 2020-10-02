/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AbstractField, IField } from './field';
import { FIELD_ORIGIN } from '../../../common/constants';
import { IVectorSource } from '../sources/vector_source';
import { TileJsonSource } from '../sources/tilejson_source/tilejson_source';
import { MVTField } from './mvt_field';

export class TileJsonField extends MVTField implements IField {
  private readonly _source: TileJsonSource;
  constructor({
    fieldName,
    source,
    origin,
  }: {
    fieldName: string;
    source: TileJsonSource;
    origin: FIELD_ORIGIN;
  }) {
    super({ fieldName, origin });
    this._source = source;
  }

  getSource(): IVectorSource {
    return this._source;
  }

  async getDataType(): Promise<string> {
    const layerConfig = await this._source.getLayerConfig();
    const type = layerConfig.fields[this.getName()];
    if (type === 'String') {
      return 'string';
    } else if (type === 'Number') {
      return 'number';
    } else {
      return 'string';
    }
  }

  async getLabel(): Promise<string> {
    return this.getName();
  }

  supportsAutoDomain() {
    return false;
  }

  canReadFromGeoJson(): boolean {
    return false;
  }
}
