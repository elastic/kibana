/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataView } from '@kbn/data-plugin/common';
import type {
  AggregationsExtendedStatsAggregation,
  AggregationsPercentilesAggregation,
  AggregationsTermsAggregation,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { AGG_TYPE } from '../../../../common/constants';
import { TileMetaFeature } from '../../../../common/descriptor_types';
import { CountAggField } from './count_agg_field';
import { isMetricCountable } from '../../util/is_metric_countable';
import { CountAggFieldParams } from './agg_field_types';
import { addFieldToDSL, getField } from '../../../../common/elasticsearch_util';
import { IField } from '../field';
import { getAggRange } from '../../util/tile_meta_feature_utils';

const TERMS_AGG_SHARD_SIZE = 5;

export interface AggFieldParams extends CountAggFieldParams {
  esDocField?: IField;
  aggType: AGG_TYPE;
}

export class AggField extends CountAggField {
  private readonly _esDocField?: IField;
  private readonly _aggType: AGG_TYPE;

  constructor(params: AggFieldParams) {
    super(params);
    this._esDocField = params.esDocField;
    this._aggType = params.aggType;
  }

  supportsFieldMetaFromEs(): boolean {
    // count and sum aggregations are not within field bounds so they do not support field meta.
    return !isMetricCountable(this._getAggType());
  }

  supportsFieldMetaFromLocalData(): boolean {
    // Elasticsearch vector tile search API returns meta tiles with numeric aggregation metrics.
    return this._source.isMvt() ? this._getDataTypeSynchronous() === 'number' : true;
  }

  isValid(): boolean {
    return !!this._esDocField;
  }

  getMbFieldName(): string {
    return this._source.isMvt() ? this.getName() + '.value' : this.getName();
  }

  canValueBeFormatted(): boolean {
    return this._getAggType() !== AGG_TYPE.UNIQUE_COUNT;
  }

  isCount() {
    return this._getAggType() === AGG_TYPE.UNIQUE_COUNT;
  }

  _getAggType(): AGG_TYPE {
    return this._aggType;
  }

  getValueAggDsl(indexPattern: DataView): unknown {
    const field = getField(indexPattern, this.getRootName());
    const aggType = this._getAggType();
    const aggBody = aggType === AGG_TYPE.TERMS ? { size: 1, shard_size: TERMS_AGG_SHARD_SIZE } : {};
    return {
      [aggType]: addFieldToDSL(aggBody, field),
    };
  }

  getRootName(): string {
    return this._esDocField ? this._esDocField.getName() : '';
  }

  async getLabel(): Promise<string> {
    return this._label
      ? this._label
      : await this._source.getAggLabel(
          this._aggType,
          this._esDocField ? await this._esDocField.getLabel() : ''
        );
  }

  _getDataTypeSynchronous(): string {
    return this._getAggType() === AGG_TYPE.TERMS ? 'string' : 'number';
  }

  async getDataType(): Promise<string> {
    return this._getDataTypeSynchronous();
  }

  getBucketCount(): number {
    // terms aggregation increases the overall number of buckets per split bucket
    return this._getAggType() === AGG_TYPE.TERMS ? TERMS_AGG_SHARD_SIZE : 0;
  }

  async getExtendedStatsFieldMetaRequest(): Promise<Record<
    string,
    { extended_stats: AggregationsExtendedStatsAggregation }
  > | null> {
    return this._esDocField ? await this._esDocField.getExtendedStatsFieldMetaRequest() : null;
  }

  async getPercentilesFieldMetaRequest(
    percentiles: number[]
  ): Promise<Record<string, { percentiles: AggregationsPercentilesAggregation }> | null> {
    return this._esDocField
      ? await this._esDocField.getPercentilesFieldMetaRequest(percentiles)
      : null;
  }

  async getCategoricalFieldMetaRequest(
    size: number
  ): Promise<Record<string, { terms: AggregationsTermsAggregation }> | null> {
    return this._esDocField ? await this._esDocField.getCategoricalFieldMetaRequest(size) : null;
  }

  pluckRangeFromTileMetaFeature(metaFeature: TileMetaFeature) {
    return getAggRange(metaFeature, this.getName());
  }
}
