/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PIVOT_SUPPORTED_AGGS } from '../../../common/types/pivot_aggs';

import { PivotGroupByConfig } from '../common';

import { StepDefineExposedState } from '../sections/create_transform/components/step_define';
import { StepDetailsExposedState } from '../sections/create_transform/components/step_details';

import { PIVOT_SUPPORTED_GROUP_BY_AGGS } from './pivot_group_by';
import { PivotAggsConfig } from './pivot_aggs';
import {
  defaultQuery,
  getPreviewTransformRequestBody,
  getCreateTransformRequestBody,
  getCreateTransformSettingsRequestBody,
  getPivotQuery,
  getMissingBucketConfig,
  getRequestPayload,
  isDefaultQuery,
  isMatchAllQuery,
  isSimpleQuery,
  matchAllQuery,
  PivotQuery,
} from './request';
import { LatestFunctionConfigUI } from '../../../common/types/transform';
import { RuntimeField } from '../../../../../../src/plugins/data/common';

const simpleQuery: PivotQuery = { query_string: { query: 'airline:AAL' } };

const groupByTerms: PivotGroupByConfig = {
  agg: PIVOT_SUPPORTED_GROUP_BY_AGGS.TERMS,
  field: 'the-group-by-field',
  aggName: 'the-group-by-agg-name',
  dropDownName: 'the-group-by-drop-down-name',
};

const aggsAvg: PivotAggsConfig = {
  agg: PIVOT_SUPPORTED_AGGS.AVG,
  field: 'the-agg-field',
  aggName: 'the-agg-agg-name',
  dropDownName: 'the-agg-drop-down-name',
};

describe('Transform: Common', () => {
  test('isMatchAllQuery()', () => {
    expect(isMatchAllQuery(defaultQuery)).toBe(false);
    expect(isMatchAllQuery(matchAllQuery)).toBe(true);
    expect(isMatchAllQuery(simpleQuery)).toBe(false);
  });

  test('isSimpleQuery()', () => {
    expect(isSimpleQuery(defaultQuery)).toBe(true);
    expect(isSimpleQuery(matchAllQuery)).toBe(false);
    expect(isSimpleQuery(simpleQuery)).toBe(true);
  });

  test('isDefaultQuery()', () => {
    expect(isDefaultQuery(defaultQuery)).toBe(true);
    expect(isDefaultQuery(matchAllQuery)).toBe(false);
    expect(isDefaultQuery(simpleQuery)).toBe(false);
  });

  test('getPivotQuery()', () => {
    const query = getPivotQuery('the-query');

    expect(query).toEqual({
      query_string: {
        query: 'the-query',
        default_operator: 'AND',
      },
    });
  });

  test('getPreviewTransformRequestBody()', () => {
    const query = getPivotQuery('the-query');

    const request = getPreviewTransformRequestBody('the-data-view-title', query, {
      pivot: {
        aggregations: { 'the-agg-agg-name': { avg: { field: 'the-agg-field' } } },
        group_by: { 'the-group-by-agg-name': { terms: { field: 'the-group-by-field' } } },
      },
    });

    expect(request).toEqual({
      pivot: {
        aggregations: { 'the-agg-agg-name': { avg: { field: 'the-agg-field' } } },
        group_by: { 'the-group-by-agg-name': { terms: { field: 'the-group-by-field' } } },
      },
      source: {
        index: ['the-data-view-title'],
        query: { query_string: { default_operator: 'AND', query: 'the-query' } },
      },
    });
  });

  test('getPreviewTransformRequestBody() with comma-separated index pattern', () => {
    const query = getPivotQuery('the-query');
    const request = getPreviewTransformRequestBody('the-data-view-title,the-other-title', query, {
      pivot: {
        aggregations: { 'the-agg-agg-name': { avg: { field: 'the-agg-field' } } },
        group_by: { 'the-group-by-agg-name': { terms: { field: 'the-group-by-field' } } },
      },
    });

    expect(request).toEqual({
      pivot: {
        aggregations: { 'the-agg-agg-name': { avg: { field: 'the-agg-field' } } },
        group_by: { 'the-group-by-agg-name': { terms: { field: 'the-group-by-field' } } },
      },
      source: {
        index: ['the-data-view-title', 'the-other-title'],
        query: { query_string: { default_operator: 'AND', query: 'the-query' } },
      },
    });
  });

  test('getMissingBucketConfig()', () => {
    expect(getMissingBucketConfig(groupByTerms)).toEqual({});
    expect(getMissingBucketConfig({ ...groupByTerms, ...{ missing_bucket: true } })).toEqual({
      missing_bucket: true,
    });
    expect(getMissingBucketConfig({ ...groupByTerms, ...{ missing_bucket: false } })).toEqual({
      missing_bucket: false,
    });
  });

  test('getRequestPayload()', () => {
    expect(getRequestPayload([], [groupByTerms])).toEqual({
      pivot: {
        aggregations: {},
        group_by: {
          'the-group-by-agg-name': {
            terms: {
              field: 'the-group-by-field',
            },
          },
        },
      },
    });
    expect(getRequestPayload([], [{ ...groupByTerms, ...{ missing_bucket: true } }])).toEqual({
      pivot: {
        aggregations: {},
        group_by: {
          'the-group-by-agg-name': {
            terms: {
              field: 'the-group-by-field',
              missing_bucket: true,
            },
          },
        },
      },
    });
    expect(getRequestPayload([], [{ ...groupByTerms, ...{ missing_bucket: false } }])).toEqual({
      pivot: {
        aggregations: {},
        group_by: {
          'the-group-by-agg-name': {
            terms: {
              field: 'the-group-by-field',
              missing_bucket: false,
            },
          },
        },
      },
    });
  });

  test('getPreviewTransformRequestBody() with missing_buckets config', () => {
    const query = getPivotQuery('the-query');
    const request = getPreviewTransformRequestBody(
      'the-data-view-title',
      query,
      getRequestPayload([aggsAvg], [{ ...groupByTerms, ...{ missing_bucket: true } }])
    );

    expect(request).toEqual({
      pivot: {
        aggregations: { 'the-agg-agg-name': { avg: { field: 'the-agg-field' } } },
        group_by: {
          'the-group-by-agg-name': { terms: { field: 'the-group-by-field', missing_bucket: true } },
        },
      },
      source: {
        index: ['the-data-view-title'],
        query: { query_string: { default_operator: 'AND', query: 'the-query' } },
      },
    });
  });

  test('getCreateTransformRequestBody()', () => {
    const pivotState: StepDefineExposedState = {
      aggList: { 'the-agg-name': aggsAvg },
      groupByList: { 'the-group-by-name': groupByTerms },
      isAdvancedPivotEditorEnabled: false,
      isAdvancedSourceEditorEnabled: false,
      sourceConfigUpdated: false,
      searchLanguage: 'kuery',
      searchString: 'the-query',
      searchQuery: 'the-search-query',
      valid: true,
      transformFunction: 'pivot',
      latestConfig: {} as LatestFunctionConfigUI,
      previewRequest: {
        pivot: {
          aggregations: { 'the-agg-agg-name': { avg: { field: 'the-agg-field' } } },
          group_by: { 'the-group-by-agg-name': { terms: { field: 'the-group-by-field' } } },
        },
      },
      validationStatus: {
        isValid: true,
      },
      runtimeMappings: undefined,
      runtimeMappingsUpdated: false,
      isRuntimeMappingsEditorEnabled: false,
    };
    const transformDetailsState: StepDetailsExposedState = {
      continuousModeDateField: 'the-continuous-mode-date-field',
      continuousModeDelay: 'the-continuous-mode-delay',
      createDataView: false,
      isContinuousModeEnabled: false,
      isRetentionPolicyEnabled: false,
      retentionPolicyDateField: '',
      retentionPolicyMaxAge: '',
      transformId: 'the-transform-id',
      transformDescription: 'the-transform-description',
      transformFrequency: '1m',
      transformSettingsMaxPageSearchSize: 100,
      transformSettingsDocsPerSecond: 400,
      destinationIndex: 'the-destination-index',
      destinationIngestPipeline: 'the-destination-ingest-pipeline',
      touched: true,
      valid: true,
    };

    const request = getCreateTransformRequestBody(
      'the-data-view-title',
      pivotState,
      transformDetailsState
    );

    expect(request).toEqual({
      description: 'the-transform-description',
      dest: { index: 'the-destination-index', pipeline: 'the-destination-ingest-pipeline' },
      frequency: '1m',
      pivot: {
        aggregations: { 'the-agg-agg-name': { avg: { field: 'the-agg-field' } } },
        group_by: { 'the-group-by-agg-name': { terms: { field: 'the-group-by-field' } } },
      },
      settings: {
        max_page_search_size: 100,
        docs_per_second: 400,
      },
      source: {
        index: ['the-data-view-title'],
        query: { query_string: { default_operator: 'AND', query: 'the-search-query' } },
      },
    });
  });

  test('getCreateTransformRequestBody() with runtime fields', () => {
    const runtimeMappings = {
      rt_bytes_bigger: {
        type: 'double',
        script: {
          source: "emit(doc['bytes'].value * 2.0)",
        },
      } as RuntimeField,
    };

    const pivotState: StepDefineExposedState = {
      aggList: { 'the-agg-name': aggsAvg },
      groupByList: { 'the-group-by-name': groupByTerms },
      isAdvancedPivotEditorEnabled: false,
      isAdvancedSourceEditorEnabled: false,
      sourceConfigUpdated: false,
      searchLanguage: 'kuery',
      searchString: 'the-query',
      searchQuery: 'the-search-query',
      valid: true,
      transformFunction: 'pivot',
      latestConfig: {} as LatestFunctionConfigUI,
      previewRequest: {
        pivot: {
          aggregations: { 'the-agg-agg-name': { avg: { field: 'the-agg-field' } } },
          group_by: { 'the-group-by-agg-name': { terms: { field: 'the-group-by-field' } } },
        },
      },
      validationStatus: {
        isValid: true,
      },
      runtimeMappings,
      runtimeMappingsUpdated: false,
      isRuntimeMappingsEditorEnabled: false,
    };
    const transformDetailsState: StepDetailsExposedState = {
      continuousModeDateField: 'the-continuous-mode-date-field',
      continuousModeDelay: 'the-continuous-mode-delay',
      createDataView: false,
      isContinuousModeEnabled: false,
      isRetentionPolicyEnabled: false,
      retentionPolicyDateField: '',
      retentionPolicyMaxAge: '',
      transformId: 'the-transform-id',
      transformDescription: 'the-transform-description',
      transformFrequency: '1m',
      transformSettingsMaxPageSearchSize: 100,
      transformSettingsDocsPerSecond: 400,
      destinationIndex: 'the-destination-index',
      destinationIngestPipeline: 'the-destination-ingest-pipeline',
      touched: true,
      valid: true,
    };

    const request = getCreateTransformRequestBody(
      'the-data-view-title',
      pivotState,
      transformDetailsState
    );

    expect(request).toEqual({
      description: 'the-transform-description',
      dest: { index: 'the-destination-index', pipeline: 'the-destination-ingest-pipeline' },
      frequency: '1m',
      pivot: {
        aggregations: { 'the-agg-agg-name': { avg: { field: 'the-agg-field' } } },
        group_by: { 'the-group-by-agg-name': { terms: { field: 'the-group-by-field' } } },
      },
      settings: {
        max_page_search_size: 100,
        docs_per_second: 400,
      },
      source: {
        index: ['the-data-view-title'],
        query: { query_string: { default_operator: 'AND', query: 'the-search-query' } },
        runtime_mappings: runtimeMappings,
      },
    });
  });

  test('getCreateTransformSettingsRequestBody() with multiple settings', () => {
    const transformDetailsState: Partial<StepDetailsExposedState> = {
      transformSettingsDocsPerSecond: 400,
      transformSettingsMaxPageSearchSize: 100,
    };

    const request = getCreateTransformSettingsRequestBody(transformDetailsState);

    expect(request).toEqual({
      settings: {
        docs_per_second: 400,
        max_page_search_size: 100,
      },
    });
  });

  test('getCreateTransformSettingsRequestBody() with one setting', () => {
    const transformDetailsState: Partial<StepDetailsExposedState> = {
      transformSettingsDocsPerSecond: 400,
    };

    const request = getCreateTransformSettingsRequestBody(transformDetailsState);

    expect(request).toEqual({
      settings: {
        docs_per_second: 400,
      },
    });
  });
});
