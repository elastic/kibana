/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IndexPattern } from 'src/plugins/data/public';
import { IField } from './field';
import { AGG_TYPE } from '../../../common/constants';
import { CountAggField } from './count_agg_field';
import { isMetricCountable } from '../util/is_metric_countable';
import { IESAggFieldParams } from './agg_field_types';
import { addFieldToDSL, getField } from '../../../common/elasticsearch_util';

const TERMS_AGG_SHARD_SIZE = 5;

export interface IESFieldedAggParams extends IESAggFieldParams {
  esDocField?: IField;
  aggType: AGG_TYPE;
}

export class AggField extends CountAggField {
  private readonly _esDocField?: IField;
  private readonly _aggType: AGG_TYPE;

  constructor(params: IESFieldedAggParams) {
    super(params);
    this._esDocField = params.esDocField;
    this._aggType = params.aggType;
  }

  _getESDocFieldName(): string {
    return this._esDocField ? this._esDocField.getName() : '';
  }

  isValid(): boolean {
    return !!this._esDocField;
  }

  supportsFieldMeta(): boolean {
    // count and sum aggregations are not within field bounds so they do not support field meta.
    return !isMetricCountable(this._getAggType());
  }

  canValueBeFormatted(): boolean {
    return this._getAggType() !== AGG_TYPE.UNIQUE_COUNT;
  }

  _getAggType(): AGG_TYPE {
    return this._aggType;
  }

  getValueAggDsl(indexPattern: IndexPattern): unknown {
    const field = getField(indexPattern, this.getRootName());
    const aggType = this._getAggType();
    const aggBody = aggType === AGG_TYPE.TERMS ? { size: 1, shard_size: TERMS_AGG_SHARD_SIZE } : {};
    return {
      [aggType]: addFieldToDSL(aggBody, field),
    };
  }

  getBucketCount(): number {
    // terms aggregation increases the overall number of buckets per split bucket
    return this._getAggType() === AGG_TYPE.TERMS ? TERMS_AGG_SHARD_SIZE : 0;
  }

  async getOrdinalFieldMetaRequest(): Promise<unknown> {
    return this._esDocField ? await this._esDocField.getOrdinalFieldMetaRequest() : null;
  }

  async getCategoricalFieldMetaRequest(size: number): Promise<unknown> {
    return this._esDocField ? await this._esDocField.getCategoricalFieldMetaRequest(size) : null;
  }
}
