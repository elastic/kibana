/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';

import { PIVOT_SUPPORTED_AGGS } from '../../../../../../common/types/pivot_aggs';

import {
  PivotAggsConfig,
  PivotGroupByConfig,
  PIVOT_SUPPORTED_GROUP_BY_AGGS,
} from '../../../../common';
import { SearchItems } from '../../../../hooks/use_search_items';

import { StepDefineExposedState } from './common';
import { StepDefineSummary } from './step_define_summary';

jest.mock('../../../../../shared_imports');
jest.mock('../../../../app_dependencies');

import { MlSharedContext } from '../../../../__mocks__/shared_context';
import { getMlSharedImports } from '../../../../../shared_imports';

describe('Transform: <DefinePivotSummary />', () => {
  // Using the async/await wait()/done() pattern to avoid act() errors.
  test('Minimal initialization', async () => {
    // Arrange
    const mlSharedImports = await getMlSharedImports();

    const searchItems = {
      dataView: {
        title: 'the-data-view-title',
        fields: [] as any[],
      } as SearchItems['dataView'],
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
      searchLanguage: 'kuery',
      searchString: 'the-query',
      searchQuery: 'the-search-query',
      valid: true,
      validationStatus: {
        isValid: true,
      },
      transformFunction: 'pivot',
      previewRequest: {
        pivot: {
          aggregations: {
            // @ts-ignore
            'the-agg-name': agg,
          },
          group_by: {
            'the-group-by-name': groupBy,
          },
        },
      },
    };

    const { queryByText } = render(
      <MlSharedContext.Provider value={mlSharedImports}>
        <StepDefineSummary formState={formState} searchItems={searchItems as SearchItems} />
      </MlSharedContext.Provider>
    );

    // Act
    // Assert
    await waitFor(() => {
      expect(queryByText('Group by')).toBeInTheDocument();
      expect(queryByText('Aggregations')).toBeInTheDocument();
    });
  });
});
