/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IndexPattern } from 'src/plugins/data/common/index_patterns/index_patterns';
import { IField } from '../field';
import { AGG_TYPE } from '../../../../common/constants';
import { IESAggField, CountAggFieldParams } from './agg_field_types';
import { CountAggField } from './count_agg_field';
import { addFieldToDSL, getField } from '../../../../common/elasticsearch_util';

export interface PercentileAggParams extends CountAggFieldParams {
  esDocField?: IField;
  percentile: number;
}

export class PercentileAggField extends CountAggField implements IESAggField {
  private readonly _percentile: number;
  private readonly _esDocField?: IField;
  constructor(params: PercentileAggParams) {
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

  getName() {
    return `${super.getName()}_${this._percentile}`;
  }

  getRootName(): string {
    return this._esDocField ? this._esDocField.getName() : '';
  }

  getValueAggDsl(indexPattern: IndexPattern): unknown {
    const field = getField(indexPattern, this.getRootName());
    const dsl: Record<string, unknown> = addFieldToDSL({}, field);
    dsl.percents = [this._percentile];
    return {
      percentiles: dsl,
    };
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
