/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FIELD_ORIGIN } from '../../../common/constants';
import type { IEmsFileSource } from '../sources/ems_file_source/ems_file_source';
import type { IVectorSource } from '../sources/vector_source/vector_source';
import type { IField } from './field';
import { AbstractField } from './field';

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
