/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AbstractField, IField } from './field';
import { FIELD_ORIGIN } from '../../../common/constants';
import { ITiledSingleLayerVectorSource, IVectorSource } from '../sources/vector_source';
import { MVTFieldType } from '../../../common/descriptor_types';

export class MVTField extends AbstractField implements IField {
  private readonly _source: ITiledSingleLayerVectorSource;
  private readonly _type: MVTFieldType;
  constructor({
    fieldName,
    type,
    source,
    origin,
  }: {
    fieldName: string;
    source: ITiledSingleLayerVectorSource;
    origin: FIELD_ORIGIN;
    type: MVTFieldType;
  }) {
    super({ fieldName, origin });
    this._source = source;
    this._type = type;
  }

  getSource(): IVectorSource {
    return this._source;
  }

  async getDataType(): Promise<string> {
    if (this._type === MVTFieldType.String) {
      return 'string';
    } else if (this._type === MVTFieldType.Number) {
      return 'number';
    } else {
      throw new Error(`Unrecognized MVT field-type ${this._type}`);
    }
  }

  async getLabel(): Promise<string> {
    return this.getName();
  }

  supportsAutoDomain() {
    return false;
  }
}
