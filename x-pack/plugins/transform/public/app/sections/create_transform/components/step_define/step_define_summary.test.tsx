/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render, wait } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';

import { Providers } from '../../../../app_dependencies.mock';
import {
  PivotAggsConfig,
  PivotGroupByConfig,
  PIVOT_SUPPORTED_AGGS,
  PIVOT_SUPPORTED_GROUP_BY_AGGS,
} from '../../../../common';
import { SearchItems } from '../../../../hooks/use_search_items';

import { StepDefineExposedState } from './step_define_form';
import { StepDefineSummary } from './step_define_summary';

jest.mock('ui/new_platform');
jest.mock('../../../../../shared_imports');

describe('Transform: <DefinePivotSummary />', () => {
  // Using the async/await wait()/done() pattern to avoid act() errors.
  test('Minimal initialization', async done => {
    // Arrange
    const searchItems = {
      indexPattern: {
        title: 'the-index-pattern-title',
        fields: [] as any[],
      } as SearchItems['indexPattern'],
    };
    const groupBy: PivotGroupByConfig = {
      agg: PIVOT_SUPPORTED_GROUP_BY_AGGS.TERMS,
      field: 'the-group-by-field',
      aggName: 'the-group-by-agg-name',
      dropDownName: 'the-group-by-drop-down-name',
    };
    const agg: PivotAggsConfig = {
      agg: PIVOT_SUPPORTED_AGGS.AVG,
      field: 'the-agg-field',
      aggName: 'the-group-by-agg-name',
      dropDownName: 'the-group-by-drop-down-name',
    };
    const formState: StepDefineExposedState = {
      aggList: { 'the-agg-name': agg },
      groupByList: { 'the-group-by-name': groupBy },
      isAdvancedPivotEditorEnabled: false,
      isAdvancedSourceEditorEnabled: false,
      sourceConfigUpdated: false,
      searchString: 'the-query',
      searchQuery: 'the-search-query',
      valid: true,
    };

    const { getByText } = render(
      <Providers>
        <StepDefineSummary formState={formState} searchItems={searchItems as SearchItems} />
      </Providers>
    );

    // Act
    // Assert
    expect(getByText('Group by')).toBeInTheDocument();
    expect(getByText('Aggregations')).toBeInTheDocument();
    await wait();
    done();
  });
});
