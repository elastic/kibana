/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { CoreSetup } from 'src/core/public';

import { IndexPattern } from '../../../../../../../../src/plugins/data/public';

import { SavedSearchQuery } from '../../../contexts/ml';
import { OMIT_FIELDS } from '../../../../../common/constants/field_types';
import { IndexPatternTitle } from '../../../../../common/types/kibana';
import { DEFAULT_SAMPLER_SHARD_SIZE } from '../../../../../common/constants/field_histograms';

import { ml } from '../../../services/ml_api_service';
import { FieldHistogramRequestConfig, FieldRequestConfig } from '../common';

// Maximum number of examples to obtain for text type fields.
const MAX_EXAMPLES_DEFAULT: number = 10;

export class DataLoader {
  private _indexPattern: IndexPattern;
  private _indexPatternTitle: IndexPatternTitle = '';
  private _maxExamples: number = MAX_EXAMPLES_DEFAULT;
  private _toastNotifications: CoreSetup['notifications']['toasts'];

  constructor(
    indexPattern: IndexPattern,
    toastNotifications: CoreSetup['notifications']['toasts']
  ) {
    this._indexPattern = indexPattern;
    this._indexPatternTitle = indexPattern.title;
    this._toastNotifications = toastNotifications;
  }

  async loadOverallData(
    query: string | SavedSearchQuery,
    samplerShardSize: number,
    earliest: number | undefined,
    latest: number | undefined
  ): Promise<any> {
    const aggregatableFields: string[] = [];
    const nonAggregatableFields: string[] = [];
    this._indexPattern.fields.forEach((field) => {
      const fieldName = field.displayName !== undefined ? field.displayName : field.name;
      if (this.isDisplayField(fieldName) === true) {
        if (field.aggregatable === true) {
          aggregatableFields.push(fieldName);
        } else {
          nonAggregatableFields.push(fieldName);
        }
      }
    });

    // Need to find:
    // 1. List of aggregatable fields that do exist in docs
    // 2. List of aggregatable fields that do not exist in docs
    // 3. List of non-aggregatable fields that do exist in docs.
    // 4. List of non-aggregatable fields that do not exist in docs.
    const stats = await ml.getVisualizerOverallStats({
      indexPatternTitle: this._indexPatternTitle,
      query,
      timeFieldName: this._indexPattern.timeFieldName,
      samplerShardSize,
      earliest,
      latest,
      aggregatableFields,
      nonAggregatableFields,
    });

    return stats;
  }

  async loadFieldStats(
    query: string | SavedSearchQuery,
    samplerShardSize: number,
    earliest: number | undefined,
    latest: number | undefined,
    fields: FieldRequestConfig[],
    interval?: number
  ): Promise<any[]> {
    const stats = await ml.getVisualizerFieldStats({
      indexPatternTitle: this._indexPatternTitle,
      query,
      timeFieldName: this._indexPattern.timeFieldName,
      earliest,
      latest,
      samplerShardSize,
      interval,
      fields,
      maxExamples: this._maxExamples,
    });

    return stats;
  }

  async loadFieldHistograms(
    fields: FieldHistogramRequestConfig[],
    query: string | SavedSearchQuery,
    samplerShardSize = DEFAULT_SAMPLER_SHARD_SIZE
  ): Promise<any[]> {
    const stats = await ml.getVisualizerFieldHistograms({
      indexPatternTitle: this._indexPatternTitle,
      query,
      fields,
      samplerShardSize,
    });

    return stats;
  }

  displayError(err: any) {
    if (err.statusCode === 500) {
      this._toastNotifications.addDanger(
        i18n.translate('xpack.ml.datavisualizer.dataLoader.internalServerErrorMessage', {
          defaultMessage:
            'Error loading data in index {index}. {message}. ' +
            'The request may have timed out. Try using a smaller sample size or narrowing the time range.',
          values: {
            index: this._indexPattern.title,
            message: err.message,
          },
        })
      );
    } else {
      this._toastNotifications.addDanger(
        i18n.translate('xpack.ml.datavisualizer.page.errorLoadingDataMessage', {
          defaultMessage: 'Error loading data in index {index}. {message}',
          values: {
            index: this._indexPattern.title,
            message: err.message,
          },
        })
      );
    }
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
