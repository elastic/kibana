/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { RulesContainer } from './rules_container';
import { render, screen } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import { useFindCspBenchmarkRule } from './use_csp_benchmark_rules';
import * as TEST_SUBJECTS from './test_subjects';
import { Chance } from 'chance';
import { TestProvider } from '../../test/test_provider';
import type { CspBenchmarkRule } from '../../../common/types/latest';
import { useParams } from 'react-router-dom';
import { coreMock } from '@kbn/core/public/mocks';

const chance = new Chance();

jest.mock('./use_csp_benchmark_rules', () => ({
  useFindCspBenchmarkRule: jest.fn(),
  useBulkUpdateCspBenchmarkRule: jest.fn(),
}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: jest.fn(),
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

const getWrapper =
  ({ canUpdate = true }: { canUpdate: boolean } = { canUpdate: true }): React.FC =>
  ({ children }) => {
    const coreStart = coreMock.createStart();
    const core = {
      ...coreStart,
      application: {
        ...coreStart.application,
        capabilities: {
          ...coreStart.application.capabilities,
          siem: { crud: canUpdate },
        },
      },
    };
    return <TestProvider core={core}>{children}</TestProvider>;
  };

const getRuleMock = (id = chance.guid()): CspBenchmarkRule =>
  ({
    metadata: {
      audit: chance.sentence(),
      benchmark: {
        name: chance.word(),
        version: chance.sentence(),
        id: chance.word(),
        rule_number: chance.word(),
      },
      default_value: chance.sentence(),
      description: chance.sentence(),
      id,
      impact: chance.sentence(),
      name: chance.sentence(),
      profile_applicability: chance.sentence(),
      rationale: chance.sentence(),
      references: chance.sentence(),
      rego_rule_id: chance.word(),
      remediation: chance.sentence(),
      section: chance.sentence(),
      tags: [chance.word(), chance.word()],
      version: chance.sentence(),
    },
  } as CspBenchmarkRule);

const params = {
  paginations: {
    page: 1,
    perPage: 10000,
    ruleNumber: undefined,
    search: '',
    section: undefined,
    sortField: 'metadata.benchmark.rule_number',
    sortOrder: 'asc',
  },
  benchmarkId: 'cis_k8s',
  benchmarkVersion: '1.0.1',
};

describe('<RulesContainer />', () => {
  beforeEach(() => {
    queryClient.clear();
    jest.clearAllMocks();

    (useParams as jest.Mock).mockReturnValue(params);
  });

  it('displays rules with their initial state', async () => {
    const Wrapper = getWrapper();
    const rule1 = getRuleMock();

    (useFindCspBenchmarkRule as jest.Mock).mockReturnValue({
      status: 'success',
      data: {
        total: 1,
        items: [rule1],
      },
    });

    render(
      <Wrapper>
        <RulesContainer />
      </Wrapper>
    );

    expect(await screen.findByTestId(TEST_SUBJECTS.CSP_RULES_CONTAINER)).toBeInTheDocument();
    expect(await screen.findByText(rule1.metadata.name)).toBeInTheDocument();
    expect(useFindCspBenchmarkRule).toHaveBeenCalledWith(
      params.paginations,
      params.benchmarkId,
      params.benchmarkVersion
    );
  });
});
