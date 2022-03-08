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

describe('<BenchmarksTable />', () => {
  const chance = new Chance();

  it('renders all column headers', () => {
    render(<BenchmarksTable benchmarks={[]} />);

    Object.values(TABLE_COLUMN_HEADERS).forEach((columnHeader) => {
      expect(screen.getByText(columnHeader)).toBeInTheDocument();
    });
  });

  it('renders integration name', () => {
    const integrationName = chance.sentence();
    const benchmarks = [
      createCspBenchmarkIntegrationFixture({ integration_name: integrationName }),
    ];

    render(<BenchmarksTable benchmarks={benchmarks} />);

    expect(screen.getByText(integrationName)).toBeInTheDocument();
  });

  it('renders benchmark name', () => {
    const benchmarkName = chance.sentence();
    const benchmarks = [createCspBenchmarkIntegrationFixture({ benchmark: benchmarkName })];

    render(<BenchmarksTable benchmarks={benchmarks} />);

    expect(screen.getByText(benchmarkName)).toBeInTheDocument();
  });

  it('renders active rules', () => {
    const activeRules = chance.integer({ min: 1 });
    const totalRules = chance.integer({ min: activeRules });
    const benchmarks = [
      createCspBenchmarkIntegrationFixture({ rules: { active: activeRules, total: totalRules } }),
    ];

    render(<BenchmarksTable benchmarks={benchmarks} />);

    expect(screen.getByText(`${activeRules} of ${totalRules}`)).toBeInTheDocument();
  });

  it('renders agent policy name', () => {
    const agentPolicy = {
      id: chance.guid(),
      name: chance.sentence(),
      number_of_agents: chance.integer({ min: 1 }),
    };

    const benchmarks = [createCspBenchmarkIntegrationFixture({ agent_policy: agentPolicy })];

    render(<BenchmarksTable benchmarks={benchmarks} />);

    expect(screen.getByText(agentPolicy.name)).toBeInTheDocument();
  });

  it('renders number of agents', () => {
    const agentPolicy = {
      id: chance.guid(),
      name: chance.sentence(),
      number_of_agents: chance.integer({ min: 1 }),
    };

    const benchmarks = [createCspBenchmarkIntegrationFixture({ agent_policy: agentPolicy })];

    render(<BenchmarksTable benchmarks={benchmarks} />);

    expect(screen.getByText(agentPolicy.number_of_agents)).toBeInTheDocument();
  });

  it('renders created by', () => {
    const createdBy = chance.sentence();
    const benchmarks = [createCspBenchmarkIntegrationFixture({ created_by: createdBy })];

    render(<BenchmarksTable benchmarks={benchmarks} />);

    expect(screen.getByText(createdBy)).toBeInTheDocument();
  });

  it('renders created at', () => {
    const createdAt = chance.date({ year: chance.integer({ min: 2015, max: 2021 }) }) as Date;
    const benchmarks = [createCspBenchmarkIntegrationFixture({ created_at: createdAt })];

    render(<BenchmarksTable benchmarks={benchmarks} />);

    expect(screen.getByText(moment(createdAt).fromNow())).toBeInTheDocument();
  });
});
