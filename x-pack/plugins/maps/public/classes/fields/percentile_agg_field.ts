/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IField } from './field';
import { AGG_TYPE } from '../../../common/constants';
import { AggField } from './agg_field';
import { IndexPattern } from '../../../../../../src/plugins/data/common/index_patterns/index_patterns';
import { IESAggField, IESAggFieldParams } from './agg_field_types';
import { CountAggField } from './count_agg_field';
import { ESDocField } from './es_doc_field';

export interface IESPercentileAggParams extends IESAggFieldParams {
  esDocField?: IField;
  percentile: number;
}

export class PercentileAggField extends CountAggField implements IESAggField {
  private readonly _percentile: number;
  private readonly _esDocField: ESDocField;
  constructor(params: IESPercentileAggParams) {
    super(params);
    this._esDocField = params.esDocField;
    this._percentile = params.percentile;
  }

  supportsFieldMeta(): boolean {
    return true;
  }

  canValueBeFormatted(): boolean {
    return true;
  }

  getValueAggDsl(indexPattern: IndexPattern): unknown | null {
    throw new Error('todo');
  }

  _getAggType(): AGG_TYPE {
    return AGG_TYPE.PERCENTILE;
  }

  async getOrdinalFieldMetaRequest(): Promise<unknown> {
    return this._esDocField ? await this._esDocField.getOrdinalFieldMetaRequest() : null;
  }

  async getCategoricalFieldMetaRequest(size: number): Promise<unknown> {
    return this._esDocField ? await this._esDocField.getCategoricalFieldMetaRequest(size) : null;
  }

  isValid(): boolean {
    return !!this._esDocField;
  }
}
