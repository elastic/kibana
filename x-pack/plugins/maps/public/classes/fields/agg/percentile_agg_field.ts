/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IndexPattern } from 'src/plugins/data/common/index_patterns/index_patterns';
import { i18n } from '@kbn/i18n';
import { AGG_TYPE } from '../../../../common/constants';
import { IESAggField, CountAggFieldParams } from './agg_field_types';
import { addFieldToDSL, getField } from '../../../../common/elasticsearch_util';
import { ESDocField } from '../es_doc_field';
import { getOrdinalSuffix } from '../../util/ordinal_suffix';
import { AggField } from './agg_field';

interface PercentileAggParams extends CountAggFieldParams {
  esDocField?: ESDocField;
  percentile: number;
}

export class PercentileAggField extends AggField implements IESAggField {
  private readonly _percentile: number;
  constructor(params: PercentileAggParams) {
    super({
      ...params,
      ...{
        aggType: AGG_TYPE.PERCENTILE,
      },
    });
    this._percentile = params.percentile;
  }

  supportsFieldMeta(): boolean {
    return true;
  }

  canValueBeFormatted(): boolean {
    return true;
  }

  async getLabel(): Promise<string> {
    if (this._label) {
      return this._label;
    }

    if (this._percentile === 50) {
      const median = i18n.translate('xpack.maps.fields.percentileMedianLabek', {
        defaultMessage: 'median',
      });
      return `${median} ${this.getRootName()}`;
    }

    const suffix = getOrdinalSuffix(this._percentile);
    return `${this._percentile}${suffix} ${this._source.getAggLabel(
      this._getAggType(),
      this.getRootName()
    )}`;
  }

  getName() {
    return `${super.getName()}_${this._percentile}`;
  }

  getValueAggDsl(indexPattern: IndexPattern): unknown {
    const field = getField(indexPattern, this.getRootName());
    const dsl: Record<string, unknown> = addFieldToDSL({}, field);
    dsl.percents = [this._percentile];
    return {
      percentiles: dsl,
    };
  }
}
