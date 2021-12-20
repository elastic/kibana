/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { ChartPanel } from './chart_panel';

const testData = 'test';

const TestingChart = ({ data }: { data: string }) => {
  return <div data-test-subj="testing-chart">{data}</div>;
};

describe('Testing chart panel display state', () => {
  it('renders loading state', () => {
    const component = render(
      <ChartPanel isLoading={true} isError={false} data={testData} chart={TestingChart} />
    );
    expect(component.getByTestId('loading')).toBeInTheDocument();
    expect(component.queryByTestId('testing-chart')).not.toBeInTheDocument();
  });

  it('renders error state', () => {
    const component = render(
      <ChartPanel isLoading={false} isError={true} data={testData} chart={TestingChart} />
    );
    expect(component.getByTestId('error')).toBeInTheDocument();
    expect(component.queryByTestId('testing-chart')).not.toBeInTheDocument();
  });

  it('renders empty state', () => {
    const component = render(
      <ChartPanel isLoading={false} isError={false} data={undefined} chart={TestingChart} />
    );
    expect(component.getByTestId('empty')).toBeInTheDocument();
    expect(component.queryByTestId('testing-chart')).not.toBeInTheDocument();
  });

  it('renders chart component', () => {
    const component = render(
      <ChartPanel isLoading={false} isError={false} data={testData} chart={TestingChart} />
    );
    expect(component.queryByTestId('loading')).not.toBeInTheDocument();
    expect(component.queryByTestId('error')).not.toBeInTheDocument();
    expect(component.queryByTestId('empty')).not.toBeInTheDocument();
    expect(component.getByTestId('testing-chart')).toBeInTheDocument();
  });
});
