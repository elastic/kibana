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
  getPivotQuery,
  PivotAggsConfig,
  PivotGroupByConfig,
  PIVOT_SUPPORTED_AGGS,
  PIVOT_SUPPORTED_GROUP_BY_AGGS,
} from '../../../../common';
import { SearchItems } from '../../../../hooks/use_search_items';

import { PivotPreview } from './pivot_preview';

jest.mock('ui/new_platform');
jest.mock('../../../../../shared_imports');

describe('Transform: <PivotPreview />', () => {
  // Using the async/await wait()/done() pattern to avoid act() errors.
  test('Minimal initialization', async done => {
    // Arrange
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
    const props = {
      aggs: { 'the-agg-name': agg },
      groupBy: { 'the-group-by-name': groupBy },
      indexPattern: {
        title: 'the-index-pattern-title',
        fields: [] as any[],
      } as SearchItems['indexPattern'],
      query: getPivotQuery('the-query'),
    };

    const { getByText } = render(
      <Providers>
        <PivotPreview {...props} />
      </Providers>
    );

    // Act
    // Assert
    expect(getByText('Transform pivot preview')).toBeInTheDocument();
    await wait();
    done();
  });
});
