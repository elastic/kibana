/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup } from 'src/core/public';

import type { DataView } from '../../../../../../../../src/plugins/data_views/public';

import { SavedSearchQuery } from '../../../contexts/ml';
import { OMIT_FIELDS } from '../../../../../common/constants/field_types';
import { IndexPatternTitle } from '../../../../../common/types/kibana';
import { DEFAULT_SAMPLER_SHARD_SIZE } from '../../../../../common/constants/field_histograms';

import { ml } from '../../../services/ml_api_service';
import { FieldHistogramRequestConfig } from '../common/request';
import { RuntimeMappings } from '../../../../../common/types/fields';

// Maximum number of examples to obtain for text type fields.
const MAX_EXAMPLES_DEFAULT: number = 10;

export class DataLoader {
  private _indexPattern: DataView;
  private _runtimeMappings: RuntimeMappings;
  private _indexPatternTitle: IndexPatternTitle = '';
  private _maxExamples: number = MAX_EXAMPLES_DEFAULT;

  constructor(indexPattern: DataView, toastNotifications?: CoreSetup['notifications']['toasts']) {
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
