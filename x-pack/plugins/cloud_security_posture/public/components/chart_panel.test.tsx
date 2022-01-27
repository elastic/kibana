/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ChartPanel } from './chart_panel';
import { CHART_PANEL_TEST_SUBJECTS } from './constants';
import Chance from 'chance';

const chance = new Chance();
const testData = chance.word();

const TestingChart = ({ data }: { data: string | undefined }) => {
  return <div data-test-subj={CHART_PANEL_TEST_SUBJECTS.TEST_CHART}>{data}</div>;
};

describe('<ChartPanel />', () => {
  it('renders loading state', () => {
    render(
      <ChartPanel isLoading={true} isError={false}>
        <TestingChart data={testData} />
      </ChartPanel>
    );
    expect(screen.getByTestId(CHART_PANEL_TEST_SUBJECTS.LOADING)).toBeInTheDocument();
    expect(screen.queryByTestId(CHART_PANEL_TEST_SUBJECTS.TEST_CHART)).not.toBeInTheDocument();
  });

  it('renders error state', () => {
    render(
      <ChartPanel isLoading={false} isError={true}>
        <TestingChart data={testData} />
      </ChartPanel>
    );
    expect(screen.getByTestId(CHART_PANEL_TEST_SUBJECTS.ERROR)).toBeInTheDocument();
    expect(screen.queryByTestId(CHART_PANEL_TEST_SUBJECTS.TEST_CHART)).not.toBeInTheDocument();
  });

  it('renders chart component', () => {
    render(
      <ChartPanel isLoading={false} isError={false}>
        <TestingChart data={testData} />
      </ChartPanel>
    );
    expect(screen.queryByTestId(CHART_PANEL_TEST_SUBJECTS.LOADING)).not.toBeInTheDocument();
    expect(screen.queryByTestId(CHART_PANEL_TEST_SUBJECTS.ERROR)).not.toBeInTheDocument();
    expect(screen.getByTestId(CHART_PANEL_TEST_SUBJECTS.TEST_CHART)).toBeInTheDocument();
  });
});
