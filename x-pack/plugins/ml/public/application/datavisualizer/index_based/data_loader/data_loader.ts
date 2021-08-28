/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CoreSetup } from '../../../../../../../../src/core/public/types';
import { IndexPattern } from '../../../../../../../../src/plugins/data/common/index_patterns/index_patterns/index_pattern';
import { DEFAULT_SAMPLER_SHARD_SIZE } from '../../../../../common/constants/field_histograms';
import { OMIT_FIELDS } from '../../../../../common/constants/field_types';
import type { RuntimeMappings } from '../../../../../common/types/fields';
import type { IndexPatternTitle } from '../../../../../common/types/kibana';
import type { SavedSearchQuery } from '../../../contexts/ml/ml_context';
import { ml } from '../../../services/ml_api_service';
import type { FieldHistogramRequestConfig } from '../common/request';

// Maximum number of examples to obtain for text type fields.
const MAX_EXAMPLES_DEFAULT: number = 10;

export class DataLoader {
  private _indexPattern: IndexPattern;
  private _runtimeMappings: RuntimeMappings;
  private _indexPatternTitle: IndexPatternTitle = '';
  private _maxExamples: number = MAX_EXAMPLES_DEFAULT;

  constructor(
    indexPattern: IndexPattern,
    toastNotifications?: CoreSetup['notifications']['toasts']
  ) {
    this._indexPattern = indexPattern;
    this._runtimeMappings = this._indexPattern.getComputedFields().runtimeFields as RuntimeMappings;
    this._indexPatternTitle = indexPattern.title;
  }

  async loadFieldHistograms(
    fields: FieldHistogramRequestConfig[],
    query: string | SavedSearchQuery,
    samplerShardSize = DEFAULT_SAMPLER_SHARD_SIZE,
    editorRuntimeMappings?: RuntimeMappings
  ): Promise<any[]> {
    const stats = await ml.getVisualizerFieldHistograms({
      indexPatternTitle: this._indexPatternTitle,
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
