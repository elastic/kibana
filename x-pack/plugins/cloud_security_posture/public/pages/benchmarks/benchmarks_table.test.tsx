/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import Chance from 'chance';
import { render, screen } from '@testing-library/react';
import moment from 'moment';
import { createCspBenchmarkIntegrationFixture } from '../../test/fixtures/csp_benchmark_integration';
import { BenchmarksTable } from './benchmarks_table';
import { TABLE_COLUMN_HEADERS } from './translations';
import { TestProvider } from '../../test/test_provider';

describe('<BenchmarksTable />', () => {
  const chance = new Chance();

  const tableProps = {
    pageIndex: 1,
    pageSize: 10,
    error: undefined,
    loading: false,
    setQuery: jest.fn(),
  };

  it('renders all column headers', () => {
    render(
      <BenchmarksTable
        {...{
          ...tableProps,
          benchmarks: [],
          totalItemCount: 0,
        }}
      />
    );

    Object.values(TABLE_COLUMN_HEADERS).forEach((columnHeader) => {
      expect(screen.getByText(columnHeader)).toBeInTheDocument();
    });
  });

  it('renders integration name', () => {
    const item = createCspBenchmarkIntegrationFixture();
    const benchmarks = [item];

    render(
      <TestProvider>
        <BenchmarksTable
          {...{
            ...tableProps,
            benchmarks,
            totalItemCount: benchmarks.length,
          }}
        />
      </TestProvider>
    );

    expect(screen.getByText(item.package_policy.name)).toBeInTheDocument();
  });

  it('renders benchmark name', () => {
    const item = createCspBenchmarkIntegrationFixture();
    const benchmarks = [item];

    render(
      <TestProvider>
        <BenchmarksTable
          {...{
            ...tableProps,
            benchmarks,
            totalItemCount: benchmarks.length,
          }}
        />
      </TestProvider>
    );

    expect(screen.getByText(item.package_policy.package!.title)).toBeInTheDocument();
  });

  it('renders agent policy name', () => {
    const agentPolicy = {
      id: chance.guid(),
      name: chance.sentence(),
      number_of_agents: chance.integer({ min: 1 }),
    };

    const benchmarks = [createCspBenchmarkIntegrationFixture({ agent_policy: agentPolicy })];

    render(
      <TestProvider>
        <BenchmarksTable
          {...{
            ...tableProps,
            benchmarks,
            totalItemCount: benchmarks.length,
          }}
        />
      </TestProvider>
    );

    expect(screen.getByText(agentPolicy.name)).toBeInTheDocument();
  });

  it('renders number of agents', () => {
    const item = createCspBenchmarkIntegrationFixture();
    const benchmarks = [item];

    render(
      <TestProvider>
        <BenchmarksTable
          {...{
            ...tableProps,
            benchmarks,
            totalItemCount: benchmarks.length,
          }}
        />
      </TestProvider>
    );

    // TODO too loose
    expect(screen.getByText(item.agent_policy.agents as number)).toBeInTheDocument();
  });

  it('renders created by', () => {
    const item = createCspBenchmarkIntegrationFixture();
    const benchmarks = [item];

    render(
      <TestProvider>
        <BenchmarksTable
          {...{
            ...tableProps,
            benchmarks,
            totalItemCount: benchmarks.length,
          }}
        />
      </TestProvider>
    );

    expect(screen.getByText(item.package_policy.created_by)).toBeInTheDocument();
  });

  it('renders created at', () => {
    const item = createCspBenchmarkIntegrationFixture();
    const benchmarks = [item];

    render(
      <TestProvider>
        <BenchmarksTable
          {...{
            ...tableProps,
            benchmarks,
            totalItemCount: benchmarks.length,
          }}
        />
      </TestProvider>
    );

    expect(screen.getByText(moment(item.package_policy.created_at).fromNow())).toBeInTheDocument();
  });
});
