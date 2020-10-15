/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IField, AbstractField } from './field';
import { IKibanaRegionSource } from '../sources/kibana_regionmap_source/kibana_regionmap_source';
import { FIELD_ORIGIN } from '../../../common/constants';
import { IVectorSource } from '../sources/vector_source';

export class KibanaRegionField extends AbstractField implements IField {
  private readonly _source: IKibanaRegionSource;

  constructor({
    fieldName,
    source,
    origin,
  }: {
    fieldName: string;
    source: IKibanaRegionSource;
    origin: FIELD_ORIGIN;
  }) {
    super({ fieldName, origin });
    this._source = source;
  }

  getSource(): IVectorSource {
    return this._source;
  }

  async getLabel(): Promise<string> {
    const meta = await this._source.getVectorFileMeta();
    // TODO remove any and @ts-ignore when vectorFileMeta type defined
    // @ts-ignore
    const field: any = meta.fields.find((f) => f.name === this.getName());
    return field ? field.description : this.getName();
  }
}
