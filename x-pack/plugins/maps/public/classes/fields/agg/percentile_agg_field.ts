/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IndexPattern } from 'src/plugins/data/common/index_patterns/index_patterns';
import { AGG_TYPE } from '../../../../common/constants';
import { IESAggField, CountAggFieldParams } from './agg_field_types';
import { CountAggField } from './count_agg_field';
import { addFieldToDSL, getField } from '../../../../common/elasticsearch_util';
import { ESDocField } from '../es_doc_field';
import { getOrdinalSuffix } from '../../util/ordinal_suffix';

export interface PercentileAggParams extends CountAggFieldParams {
  esDocField?: ESDocField;
  percentile: number;
}

export class PercentileAggField extends CountAggField implements IESAggField {
  private readonly _percentile: number;
  private readonly _esDocField?: ESDocField;
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

  async getLabel(): Promise<string> {
    const suffix = getOrdinalSuffix(this._percentile);
    return this._label
      ? this._label
      : `${this._percentile}${suffix} ${this._source.getAggLabel(
          this._getAggType(),
          this.getRootName()
        )}`;
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

  async getExtendedStatsFieldMetaRequest(): Promise<unknown | null> {
    return this._esDocField ? await this._esDocField.getExtendedStatsFieldMetaRequest() : null;
  }

  async getCategoricalFieldMetaRequest(size: number): Promise<unknown | null> {
    return this._esDocField ? await this._esDocField.getCategoricalFieldMetaRequest(size) : null;
  }

  async getPercentilesFieldMetaRequest(percentiles: number[]): Promise<unknown | null> {
    return this._esDocField
      ? await this._esDocField.getPercentilesFieldMetaRequest(percentiles)
      : null;
  }

  isValid(): boolean {
    return !!this._esDocField;
  }
}
