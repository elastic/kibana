/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IField } from './field';
import { AGG_TYPE } from '../../../common/constants';
import { AggField, IESFieldedAggParams } from './agg_field';
import { IndexPattern } from '../../../../../../src/plugins/data/common/index_patterns/index_patterns';
import { addFieldToDSL, getField } from '../../../common/elasticsearch_util';

export interface IESPercentileAggParams extends IESFieldedAggParams {
  esDocField?: IField;
  percentile: number;
}

export class PercentileAggField extends AggField {
  private readonly _percentile: number;
  constructor(params: IESPercentileAggParams) {
    super(params);
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

  getAggType(): AGG_TYPE {
    return AGG_TYPE.PERCENTILE;
  }
}
