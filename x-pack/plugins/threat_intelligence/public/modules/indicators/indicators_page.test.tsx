/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { TestProvidersComponent } from '../../common/mocks/test_providers';
import { IndicatorsPage } from './indicators_page';
import { useIndicators } from './hooks/use_indicators';
import { useIndicatorsTotalCount } from './hooks/use_indicators_total_count';
import {
  TABLE_TEST_ID as INDICATORS_TABLE_TEST_ID,
  TABLE_TEST_ID,
} from './components/indicators_table/indicators_table';
import { EMPTY_PROMPT_TEST_ID } from '../empty_page';
import { useIntegrationsPageLink } from '../../hooks/use_integrations_page_link';
import { useTIDocumentationLink } from '../../hooks/use_documentation_link';
import { useFilters } from './hooks/use_filters';

jest.mock('./hooks/use_indicators');
jest.mock('./hooks/use_indicators_total_count');
jest.mock('./hooks/use_filters');

jest.mock('../../hooks/use_integrations_page_link');
jest.mock('../../hooks/use_documentation_link');

const stub = () => {};

describe('<IndicatorsPage />', () => {
  beforeAll(() => {
    (useIndicators as jest.MockedFunction<typeof useIndicators>).mockReturnValue({
      indicators: [{ fields: {} }],
      indicatorCount: 1,
      loading: false,
      pagination: { pageIndex: 0, pageSize: 10, pageSizeOptions: [10] },
      onChangeItemsPerPage: stub,
      onChangePage: stub,
      handleRefresh: stub,
    });

    (useFilters as jest.MockedFunction<typeof useFilters>).mockReturnValue({
      filters: [],
      filterQuery: { language: 'kuery', query: '' },
      filterManager: {} as any,
      indexPatterns: [],
      handleSavedQuery: stub,
      handleSubmitQuery: stub,
      handleSubmitTimeRange: stub,
    });
  });

  describe('checking if the page should be visible (based on indicator count)', () => {
    describe('when indicator count is being loaded', () => {
      it('should render nothing at all', () => {
        (
          useIndicatorsTotalCount as jest.MockedFunction<typeof useIndicatorsTotalCount>
        ).mockReturnValue({
          count: 0,
          isLoading: true,
        });
        (
          useIntegrationsPageLink as jest.MockedFunction<typeof useIntegrationsPageLink>
        ).mockReturnValue('');
        (
          useTIDocumentationLink as jest.MockedFunction<typeof useTIDocumentationLink>
        ).mockReturnValue('');

        const { queryByTestId } = render(
          <TestProvidersComponent>
            <IndicatorsPage />
          </TestProvidersComponent>
        );

        expect(queryByTestId(EMPTY_PROMPT_TEST_ID)).not.toBeInTheDocument();
        expect(queryByTestId(TABLE_TEST_ID)).not.toBeInTheDocument();
      });
    });

    describe('when indicator count is loaded and there are no indicators', () => {
      it('should render empty page when no indicators are found', async () => {
        (
          useIndicatorsTotalCount as jest.MockedFunction<typeof useIndicatorsTotalCount>
        ).mockReturnValue({
          count: 0,
          isLoading: false,
        });
        (
          useIntegrationsPageLink as jest.MockedFunction<typeof useIntegrationsPageLink>
        ).mockReturnValue('');
        (
          useTIDocumentationLink as jest.MockedFunction<typeof useTIDocumentationLink>
        ).mockReturnValue('');

        const { queryByTestId } = render(
          <TestProvidersComponent>
            <IndicatorsPage />
          </TestProvidersComponent>
        );

        expect(queryByTestId(TABLE_TEST_ID)).not.toBeInTheDocument();
        expect(queryByTestId(EMPTY_PROMPT_TEST_ID)).toBeInTheDocument();
      });
    });
  });

  describe('when loading is done and we have some indicators', () => {
    it('should render indicators table', async () => {
      (
        useIndicatorsTotalCount as jest.MockedFunction<typeof useIndicatorsTotalCount>
      ).mockReturnValue({
        count: 7,
        isLoading: false,
      });

      const { queryByTestId } = render(
        <TestProvidersComponent>
          <IndicatorsPage />
        </TestProvidersComponent>
      );

      expect(queryByTestId(INDICATORS_TABLE_TEST_ID)).toBeInTheDocument();
      expect(queryByTestId(EMPTY_PROMPT_TEST_ID)).not.toBeInTheDocument();
    });
  });
});
