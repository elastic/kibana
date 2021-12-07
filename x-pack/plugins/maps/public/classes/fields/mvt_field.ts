/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AbstractField, IField } from './field';
import { FIELD_ORIGIN, MVT_FIELD_TYPE } from '../../../common/constants';
import { IVectorSource } from '../sources/vector_source';
import { IMvtVectorSource } from '../sources/vector_source';
import { MVTFieldDescriptor } from '../../../common/descriptor_types';

export class MVTField extends AbstractField implements IField {
  private readonly _source: IMvtVectorSource;
  private readonly _type: MVT_FIELD_TYPE;
  constructor({
    fieldName,
    type,
    source,
    origin,
  }: {
    fieldName: string;
    source: IMvtVectorSource;
    origin: FIELD_ORIGIN;
    type: MVT_FIELD_TYPE;
  }) {
    super({ fieldName, origin });
    this._source = source;
    this._type = type;
  }

  supportsFieldMetaFromEs(): boolean {
    return false;
  }

  supportsFieldMetaFromLocalData(): boolean {
    return false;
  }

  getMVTFieldDescriptor(): MVTFieldDescriptor {
    return {
      type: this._type,
      name: this.getName(),
    };
  }

  getSource(): IVectorSource {
    return this._source;
  }

  async getDataType(): Promise<string> {
    if (this._type === MVT_FIELD_TYPE.STRING) {
      return 'string';
    } else if (this._type === MVT_FIELD_TYPE.NUMBER) {
      return 'number';
    } else {
      throw new Error(`Unrecognized MVT field-type ${this._type}`);
    }
  }

  async getLabel(): Promise<string> {
    return this.getName();
  }
}
