/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PIVOT_SUPPORTED_AGGS } from '../../../common/types/pivot_aggs';

import { PivotGroupByConfig } from '../common';

import { StepDefineExposedState } from '../sections/create_transform/components/step_define';
import { StepDetailsExposedState } from '../sections/create_transform/components/step_details/step_details_form';

import { PIVOT_SUPPORTED_GROUP_BY_AGGS } from './pivot_group_by';
import { PivotAggsConfig } from './pivot_aggs';
import {
  defaultQuery,
  getPreviewTransformRequestBody,
  getCreateTransformRequestBody,
  getCreateTransformSettingsRequestBody,
  getPivotQuery,
  isDefaultQuery,
  isMatchAllQuery,
  isSimpleQuery,
  matchAllQuery,
  PivotQuery,
} from './request';

const simpleQuery: PivotQuery = { query_string: { query: 'airline:AAL' } };

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
    const groupBy: PivotGroupByConfig[] = [
      {
        agg: PIVOT_SUPPORTED_GROUP_BY_AGGS.TERMS,
        field: 'the-group-by-field',
        aggName: 'the-group-by-agg-name',
        dropDownName: 'the-group-by-drop-down-name',
      },
    ];
    const aggs: PivotAggsConfig[] = [
      {
        agg: PIVOT_SUPPORTED_AGGS.AVG,
        field: 'the-agg-field',
        aggName: 'the-agg-agg-name',
        dropDownName: 'the-agg-drop-down-name',
      },
    ];
    const request = getPreviewTransformRequestBody('the-index-pattern-title', query, groupBy, aggs);

    expect(request).toEqual({
      pivot: {
        aggregations: { 'the-agg-agg-name': { avg: { field: 'the-agg-field' } } },
        group_by: { 'the-group-by-agg-name': { terms: { field: 'the-group-by-field' } } },
      },
      source: {
        index: ['the-index-pattern-title'],
        query: { query_string: { default_operator: 'AND', query: 'the-query' } },
      },
    });
  });

  test('getPreviewTransformRequestBody() with comma-separated index pattern', () => {
    const query = getPivotQuery('the-query');
    const groupBy: PivotGroupByConfig[] = [
      {
        agg: PIVOT_SUPPORTED_GROUP_BY_AGGS.TERMS,
        field: 'the-group-by-field',
        aggName: 'the-group-by-agg-name',
        dropDownName: 'the-group-by-drop-down-name',
      },
    ];
    const aggs: PivotAggsConfig[] = [
      {
        agg: PIVOT_SUPPORTED_AGGS.AVG,
        field: 'the-agg-field',
        aggName: 'the-agg-agg-name',
        dropDownName: 'the-agg-drop-down-name',
      },
    ];
    const request = getPreviewTransformRequestBody(
      'the-index-pattern-title,the-other-title',
      query,
      groupBy,
      aggs
    );

    expect(request).toEqual({
      pivot: {
        aggregations: { 'the-agg-agg-name': { avg: { field: 'the-agg-field' } } },
        group_by: { 'the-group-by-agg-name': { terms: { field: 'the-group-by-field' } } },
      },
      source: {
        index: ['the-index-pattern-title', 'the-other-title'],
        query: { query_string: { default_operator: 'AND', query: 'the-query' } },
      },
    });
  });

  test('getCreateTransformRequestBody()', () => {
    const groupBy: PivotGroupByConfig = {
      agg: PIVOT_SUPPORTED_GROUP_BY_AGGS.TERMS,
      field: 'the-group-by-field',
      aggName: 'the-group-by-agg-name',
      dropDownName: 'the-group-by-drop-down-name',
    };
    const agg: PivotAggsConfig = {
      agg: PIVOT_SUPPORTED_AGGS.AVG,
      field: 'the-agg-field',
      aggName: 'the-agg-agg-name',
      dropDownName: 'the-agg-drop-down-name',
    };
    const pivotState: StepDefineExposedState = {
      aggList: { 'the-agg-name': agg },
      groupByList: { 'the-group-by-name': groupBy },
      isAdvancedPivotEditorEnabled: false,
      isAdvancedSourceEditorEnabled: false,
      sourceConfigUpdated: false,
      searchLanguage: 'kuery',
      searchString: 'the-query',
      searchQuery: 'the-search-query',
      valid: true,
    };
    const transformDetailsState: StepDetailsExposedState = {
      continuousModeDateField: 'the-continuous-mode-date-field',
      continuousModeDelay: 'the-continuous-mode-delay',
      createIndexPattern: false,
      isContinuousModeEnabled: false,
      transformId: 'the-transform-id',
      transformDescription: 'the-transform-description',
      transformFrequency: '1m',
      transformSettingsMaxPageSearchSize: 100,
      transformSettingsDocsPerSecond: 400,
      destinationIndex: 'the-destination-index',
      touched: true,
      valid: true,
    };

    const request = getCreateTransformRequestBody(
      'the-index-pattern-title',
      pivotState,
      transformDetailsState
    );

    expect(request).toEqual({
      description: 'the-transform-description',
      dest: { index: 'the-destination-index' },
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
        index: ['the-index-pattern-title'],
        query: { query_string: { default_operator: 'AND', query: 'the-search-query' } },
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
