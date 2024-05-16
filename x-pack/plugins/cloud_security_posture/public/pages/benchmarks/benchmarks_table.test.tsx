/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { BenchmarksTable } from './benchmarks_table';
import { TestProvider } from '../../test/test_provider';
import { Benchmark } from '../../../common/types';

const tableProps = {
  pageIndex: 1,
  pageSize: 10,
  error: undefined,
  loading: false,
  setQuery: jest.fn(),
};

describe('<BenchmarksTable />', () => {
  it('it renders AWS cis integration', () => {
    const item: Benchmark = {
      id: 'cis_aws',
      version: '1.5.0',
      evaluation: 1,
      score: {
        postureScore: 85,
        resourcesEvaluated: 183,
        totalFailed: 66,
        totalFindings: 440,
        totalPassed: 374,
      },
      name: 'CIS Amazon Web Services Foundations',
    };
    const props = { ...tableProps, benchmarks: [item], totalItemCount: 1 };

    render(<BenchmarksTable {...props} />);

    expect(screen.getByText('CIS AWS')).toBeInTheDocument();
    expect(screen.getByText('1.5.0')).toBeInTheDocument();
    expect(screen.getByText('Amazon Web Services')).toBeInTheDocument();
    expect(screen.getByText('1 account')).toBeInTheDocument();
    expect(screen.getByText('60%')).toBeInTheDocument();
  });
});

//   it('renders benchmark version', () => {
//     const item = createCspBenchmarkIntegrationFixture();
//     const benchmarks = [item];

//     render(
//       <TestProvider>
//         <BenchmarksTable
//           {...{
//             ...tableProps,
//             benchmarks,
//             totalItemCount: benchmarks.length,
//           }}
//         />
//       </TestProvider>
//     );

//     expect(screen.getByText(item.version)).toBeInTheDocument();
//   });

//   it('renders applicable to', () => {
//     const item = createCspBenchmarkIntegrationFixture();
//     const benchmarks = [item];
//     const benchmarkApplicableTo = getBenchmarkApplicableTo(item.id) || '';
//     render(
//       <TestProvider>
//         <BenchmarksTable
//           {...{
//             ...tableProps,
//             benchmarks,
//             totalItemCount: benchmarks.length,
//           }}
//         />
//       </TestProvider>
//     );

//     expect(screen.getByText(benchmarkApplicableTo)).toBeInTheDocument();
//   });

//   it('renders evaluated', () => {
//     const item = createCspBenchmarkIntegrationFixture();
//     const benchmarks = [item];

//     render(
//       <TestProvider>
//         <BenchmarksTable
//           {...{
//             ...tableProps,
//             benchmarks,
//             totalItemCount: benchmarks.length,
//           }}
//         />
//       </TestProvider>
//     );
//     expect(screen.getByText(benchmarks[0].evaluation + ' accounts')).toBeInTheDocument();
//   });

//   it('renders compliance', () => {
//     const item = createCspBenchmarkIntegrationFixture();
//     const benchmarks = [item];

//     render(
//       <TestProvider>
//         <BenchmarksTable
//           {...{
//             ...tableProps,
//             benchmarks,
//             totalItemCount: benchmarks.length,
//           }}
//         />
//       </TestProvider>
//     );

//     expect(screen.getByText(item.score.postureScore + '%')).toBeInTheDocument();
//   });
// });
