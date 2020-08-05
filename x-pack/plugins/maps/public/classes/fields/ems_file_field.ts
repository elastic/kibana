/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FIELD_ORIGIN } from '../../../common/constants';
import { IField, AbstractField } from './field';
import { IVectorSource } from '../sources/vector_source';
import { IEmsFileSource } from '../sources/ems_file_source';

export class EMSFileField extends AbstractField implements IField {
  private readonly _source: IEmsFileSource;

  constructor({
    fieldName,
    source,
    origin,
  }: {
    fieldName: string;
    source: IEmsFileSource;
    origin: FIELD_ORIGIN;
  }) {
    super({ fieldName, origin });
    this._source = source;
  }

  getSource(): IVectorSource {
    return this._source;
  }

  async getLabel(): Promise<string> {
    return this._source.getEmsFieldLabel(this.getName());
  }
}
