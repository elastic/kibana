/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render, within } from '@testing-library/react';
import React, { useReducer } from 'react';

import { TestProviders } from '../../../../common/mock';
import { CoverageOverviewDashboardContext } from './coverage_overview_page';
import { createCoverageOverviewDashboardReducer, initialState } from './reducer';
import { renderHook, act } from '@testing-library/react-hooks';
import { CoverageOverviewFiltersPanel } from './filters_panel';
import { ruleStatusFilterDefaultOptions, ruleTypeFilterDefaultOptions } from './constants';

const renderFiltersPanel = () => {
  const { result } = renderHook(() =>
    useReducer(createCoverageOverviewDashboardReducer(), initialState)
  );

  const [state, dispatch] = result.current;

  return {
    wrapper: render(
      <TestProviders>
        <CoverageOverviewDashboardContext.Provider value={{ state, dispatch }}>
          <CoverageOverviewFiltersPanel isLoading={false} />
        </CoverageOverviewDashboardContext.Provider>
      </TestProviders>
    ),
    context: result,
  };
};

describe('CoverageOverviewFiltersPanel', () => {
  test('it renders all correct rule status filter options', () => {
    const { wrapper } = renderFiltersPanel();

    act(() => {
      fireEvent.click(wrapper.getByTestId('coverageOverviewRuleStatusFilterButton'));
    });

    expect(wrapper.getByTestId('coverageOverviewFilterList')).toBeInTheDocument();
    ruleStatusFilterDefaultOptions.forEach((option) => {
      expect(
        within(wrapper.getByTestId('coverageOverviewFilterList')).getByText(option.label)
      ).toBeInTheDocument();
    });
  });

  test('it renders all correct rule type filter options', () => {
    const { wrapper } = renderFiltersPanel();

    act(() => {
      fireEvent.click(wrapper.getByTestId('coverageOverviewRuleTypeFilterButton'));
    });

    expect(wrapper.getByTestId('coverageOverviewFilterList')).toBeInTheDocument();
    ruleTypeFilterDefaultOptions.forEach((option) => {
      expect(
        within(wrapper.getByTestId('coverageOverviewFilterList')).getByText(option.label)
      ).toBeInTheDocument();
    });
  });

  test('it correctly populates rule status filter state', () => {
    const { wrapper, context } = renderFiltersPanel();

    act(() => {
      fireEvent.click(wrapper.getByTestId('coverageOverviewRuleStatusFilterButton'));
    });

    act(() => {
      fireEvent.click(
        within(wrapper.getByTestId('coverageOverviewFilterList')).getByText(
          ruleStatusFilterDefaultOptions[0].label
        )
      );
    });
    expect(context.current[0].filter).toMatchInlineSnapshot(`
      Object {
        "activity": Array [
          "enabled",
        ],
      }
    `);
  });

  test('it correctly populates rule type filter state', () => {
    const { wrapper, context } = renderFiltersPanel();

    act(() => {
      fireEvent.click(wrapper.getByTestId('coverageOverviewRuleTypeFilterButton'));
    });

    act(() => {
      fireEvent.click(
        within(wrapper.getByTestId('coverageOverviewFilterList')).getByText(
          ruleTypeFilterDefaultOptions[0].label
        )
      );
    });
    expect(context.current[0].filter).toMatchInlineSnapshot(`
      Object {
        "source": Array [
          "prebuilt",
        ],
      }
    `);
  });

  test('it correctly populates search filter state', () => {
    const { wrapper, context } = renderFiltersPanel();

    act(() => {
      fireEvent.change(wrapper.getByTestId('coverageOverviewFilterSearchBar'), {
        target: { value: 'test' },
      });
      fireEvent.submit(wrapper.getByTestId('coverageOverviewFilterSearchBar'));
    });

    expect(context.current[0].filter).toMatchInlineSnapshot(`
      Object {
        "search_term": "test",
      }
    `);
  });
});
