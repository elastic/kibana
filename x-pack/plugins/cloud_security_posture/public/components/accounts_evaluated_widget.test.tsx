/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { AccountsEvaluatedWidget } from './accounts_evaluated_widget';
import { BenchmarkData } from '../../common/types_old';
import { TestProvider } from '../test/test_provider';

const mockNavToFindings = jest.fn();
jest.mock('@kbn/cloud-security-posture/src/hooks/use_navigate_findings', () => ({
  useNavigateFindings: () => mockNavToFindings,
}));

describe('AccountsEvaluatedWidget', () => {
  const benchmarkAssets = [
    { meta: { benchmarkId: 'cis_aws', assetCount: 10 } },
    { meta: { benchmarkId: 'cis_k8s', assetCount: 20 } },
  ] as BenchmarkData[];

  it('renders the component with benchmark data correctly', () => {
    const { getByText } = render(
      <TestProvider>
        <AccountsEvaluatedWidget benchmarkAssets={benchmarkAssets} benchmarkAbbreviateAbove={999} />
      </TestProvider>
    );

    expect(getByText('10')).toBeInTheDocument();
    expect(getByText('20')).toBeInTheDocument();
  });

  it('calls navToFindingsByCloudProvider when a benchmark with provider is clicked', () => {
    const { getByText } = render(
      <TestProvider>
        <AccountsEvaluatedWidget benchmarkAssets={benchmarkAssets} benchmarkAbbreviateAbove={999} />
      </TestProvider>
    );

    fireEvent.click(getByText('10'));

    expect(mockNavToFindings).toHaveBeenCalledWith(
      {
        'cloud.provider': 'aws',
        'rule.benchmark.posture_type': 'cspm',
      },
      ['cloud.account.name']
    );
  });

  it('calls navToFindingsByCisBenchmark when a benchmark with benchmarkId is clicked', () => {
    const { getByText } = render(
      <TestProvider>
        <AccountsEvaluatedWidget benchmarkAssets={benchmarkAssets} benchmarkAbbreviateAbove={999} />
      </TestProvider>
    );

    fireEvent.click(getByText('20'));

    expect(mockNavToFindings).toHaveBeenCalledWith(
      {
        'rule.benchmark.id': 'cis_k8s',
      },
      ['orchestrator.cluster.name']
    );
  });
});
