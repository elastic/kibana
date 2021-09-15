/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Maximum number of examples to obtain for text type fields.
import { CoreSetup } from 'kibana/public';
import { estypes } from '@elastic/elasticsearch';
import { i18n } from '@kbn/i18n';
import { IndexPattern } from '../../../../../../../src/plugins/data/common';
import { NON_AGGREGATABLE_FIELD_TYPES, OMIT_FIELDS } from '../../../../common/constants';
import { FieldRequestConfig } from '../../../../common/types';
import { getVisualizerFieldStats, getVisualizerOverallStats } from '../services/visualizer_stats';

type IndexPatternTitle = string;
type SavedSearchQuery = Record<string, any> | null | undefined;

const MAX_EXAMPLES_DEFAULT: number = 10;

export class DataLoader {
  private _indexPattern: IndexPattern;
  private _runtimeMappings: estypes.MappingRuntimeFields;
  private _indexPatternTitle: IndexPatternTitle = '';
  private _maxExamples: number = MAX_EXAMPLES_DEFAULT;
  private _toastNotifications: CoreSetup['notifications']['toasts'];

  constructor(
    indexPattern: IndexPattern,
    toastNotifications: CoreSetup['notifications']['toasts']
  ) {
    this._indexPattern = indexPattern;
    this._runtimeMappings = this._indexPattern.getComputedFields()
      .runtimeFields as estypes.MappingRuntimeFields;
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
        if (field.aggregatable === true && !NON_AGGREGATABLE_FIELD_TYPES.has(field.type)) {
          aggregatableFields.push(field.name);
        } else {
          nonAggregatableFields.push(field.name);
        }
      }
    });

    // Need to find:
    // 1. List of aggregatable fields that do exist in docs
    // 2. List of aggregatable fields that do not exist in docs
    // 3. List of non-aggregatable fields that do exist in docs.
    // 4. List of non-aggregatable fields that do not exist in docs.
    const stats = await getVisualizerOverallStats({
      indexPatternTitle: this._indexPatternTitle,
      query,
      timeFieldName: this._indexPattern.timeFieldName,
      samplerShardSize,
      earliest,
      latest,
      aggregatableFields,
      nonAggregatableFields,
      runtimeMappings: this._runtimeMappings,
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
    const stats = await getVisualizerFieldStats({
      indexPatternTitle: this._indexPatternTitle,
      query,
      timeFieldName: this._indexPattern.timeFieldName,
      earliest,
      latest,
      samplerShardSize,
      interval,
      fields,
      maxExamples: this._maxExamples,
      runtimeMappings: this._runtimeMappings,
    });

    return stats;
  }

  displayError(err: any) {
    if (err.statusCode === 500) {
      this._toastNotifications.addError(err, {
        title: i18n.translate('xpack.dataVisualizer.index.dataLoader.internalServerErrorMessage', {
          defaultMessage:
            'Error loading data in index {index}. {message}. ' +
            'The request may have timed out. Try using a smaller sample size or narrowing the time range.',
          values: {
            index: this._indexPattern.title,
            message: err.error ?? err.message,
          },
        }),
      });
    } else {
      this._toastNotifications.addError(err, {
        title: i18n.translate('xpack.dataVisualizer.index.errorLoadingDataMessage', {
          defaultMessage: 'Error loading data in index {index}. {message}.',
          values: {
            index: this._indexPattern.title,
            message: err.error ?? err.message,
          },
        }),
      });
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
