/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render, within } from '@testing-library/react';
import React from 'react';

import { TestProviders } from '../../../../common/mock';
import { CoverageOverviewFiltersPanel } from './filters_panel';
import {
  ruleActivityFilterDefaultOptions,
  ruleActivityFilterLabelMap,
  ruleSourceFilterDefaultOptions,
  ruleSourceFilterLabelMap,
} from './constants';
import {
  initialState,
  useCoverageOverviewDashboardContext,
} from './coverage_overview_dashboard_context';

jest.mock('./coverage_overview_dashboard_context');

const setShowExpandedCells = jest.fn();
const setRuleActivityFilter = jest.fn();
const setRuleSourceFilter = jest.fn();
const setRuleSearchFilter = jest.fn();

const mockCoverageOverviewContextReturn = {
  state: initialState,
  actions: {
    setShowExpandedCells,
    setRuleActivityFilter,
    setRuleSourceFilter,
    setRuleSearchFilter,
  },
};

(useCoverageOverviewDashboardContext as jest.Mock).mockReturnValue(
  mockCoverageOverviewContextReturn
);

const renderFiltersPanel = () => {
  return render(
    <TestProviders>
      <CoverageOverviewFiltersPanel />
    </TestProviders>
  );
};

describe('CoverageOverviewFiltersPanel', () => {
  test('it correctly populates rule activity filter state', () => {
    const wrapper = renderFiltersPanel();

    wrapper.getByTestId('coverageOverviewRuleActivityFilterButton').click();

    within(wrapper.getByTestId('coverageOverviewFilterList'))
      .getByText(ruleActivityFilterLabelMap[ruleActivityFilterDefaultOptions[0].label])
      .click();
    expect(setRuleActivityFilter).toHaveBeenCalledWith([ruleActivityFilterDefaultOptions[0].label]);
  });

  test('it correctly populates rule source filter state', () => {
    const wrapper = renderFiltersPanel();

    wrapper.getByTestId('coverageOverviewRuleSourceFilterButton').click();

    within(wrapper.getByTestId('coverageOverviewFilterList'))
      .getByText(ruleSourceFilterLabelMap[ruleSourceFilterDefaultOptions[0].label])
      .click();
    expect(setRuleSourceFilter).toHaveBeenCalledWith([ruleSourceFilterDefaultOptions[0].label]);
  });

  test('it correctly populates search filter state', () => {
    const wrapper = renderFiltersPanel();

    fireEvent.change(wrapper.getByTestId('coverageOverviewFilterSearchBar'), {
      target: { value: 'test' },
    });
    fireEvent.submit(wrapper.getByTestId('coverageOverviewFilterSearchBar'));

    expect(setRuleSearchFilter).toHaveBeenCalledWith('test');
  });
});
