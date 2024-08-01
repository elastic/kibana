/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataView } from '@kbn/data-views-plugin/public';
import { DEFAULT_SAMPLER_SHARD_SIZE } from '@kbn/ml-agg-utils';
import { OMIT_FIELDS } from '@kbn/ml-anomaly-utils';
import { type RuntimeMappings } from '@kbn/ml-runtime-field-utils';

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { IndexPatternTitle } from '../../../../../common/types/kibana';
import type { MlApiServices } from '../../../services/ml_api_service';

import type { FieldHistogramRequestConfig } from '../common/request';

// Maximum number of examples to obtain for text type fields.
const MAX_EXAMPLES_DEFAULT: number = 10;

export class DataLoader {
  private _runtimeMappings: RuntimeMappings;
  private _indexPatternTitle: IndexPatternTitle = '';
  private _maxExamples: number = MAX_EXAMPLES_DEFAULT;

  constructor(private _indexPattern: DataView, private _mlApiServices: MlApiServices) {
    this._runtimeMappings = this._indexPattern.getComputedFields().runtimeFields as RuntimeMappings;
    this._indexPatternTitle = _indexPattern.title;
  }

  async loadFieldHistograms(
    fields: FieldHistogramRequestConfig[],
    query: string | estypes.QueryDslQueryContainer,
    samplerShardSize = DEFAULT_SAMPLER_SHARD_SIZE,
    editorRuntimeMappings?: RuntimeMappings
  ): Promise<any[]> {
    const stats = await this._mlApiServices.getVisualizerFieldHistograms({
      indexPattern: this._indexPatternTitle,
      query,
      fields,
      samplerShardSize,
      runtimeMappings: editorRuntimeMappings || this._runtimeMappings,
    });

    return stats;
  }

  public set maxExamples(max: number) {
    this._maxExamples = max;
  }

  public get maxExamples(): number {
    return this._maxExamples;
  }

  // Returns whether the field with the specified name should be displayed,
  // as certain fields such as _id and _source should be omitted from the view.
  public isDisplayField(fieldName: string): boolean {
    return !OMIT_FIELDS.includes(fieldName);
  }
}
