/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import * as TEST_SUBJECTS from '../test_subjects';
import { FindingsTable } from './latest_findings_table';
import type { PropsOf } from '@elastic/eui';
import Chance from 'chance';
import type { CspFinding } from '../types';
import { TestProvider } from '../../../test/test_provider';

const chance = new Chance();

const getFakeFindings = (name: string): CspFinding & { id: string } => ({
  id: chance.word(),
  result: {
    expected: {
      source: {},
    },
    evaluation: chance.weighted(['passed', 'failed'], [0.5, 0.5]),
    evidence: {
      filemode: chance.word(),
    },
  },
  rule: {
    name,
    description: chance.paragraph(),
    impact: chance.word(),
    remediation: chance.word(),
    benchmark: {
      name: 'CIS Kubernetes',
      version: '1.6.0',
    },
    section: chance.sentence(),
    audit: chance.paragraph(),
    references: chance.paragraph(),
    profile_applicability: chance.sentence(),
    rationale: chance.paragraph(),
    default_value: chance.sentence(),
    tags: [],
  },
  agent: {
    id: chance.string(),
    name: chance.string(),
    type: chance.string(),
    version: chance.string(),
  },
  resource: {
    name: chance.string(),
    type: chance.string(),
    raw: {} as any,
    sub_type: chance.string(),
    id: chance.string(),
  },
  cycle_id: chance.string(),
  host: {} as any,
  ecs: {} as any,
  '@timestamp': new Date().toISOString(),
});

type TableProps = PropsOf<typeof FindingsTable>;

describe('<FindingsTable />', () => {
  it('renders the zero state when status success and data has a length of zero ', async () => {
    const props: TableProps = {
      loading: false,
      items: [],
      sorting: { sort: { field: '@timestamp', direction: 'desc' } },
      pagination: { pageSize: 10, pageIndex: 1, totalItemCount: 0 },
      setTableOptions: jest.fn(),
    };

    render(
      <TestProvider>
        <FindingsTable {...props} />
      </TestProvider>
    );

    expect(screen.getByTestId(TEST_SUBJECTS.FINDINGS_TABLE_ZERO_STATE)).toBeInTheDocument();
  });

  it('renders the table with provided items', () => {
    const names = chance.unique(chance.sentence, 10);
    const data = names.map(getFakeFindings);

    const props: TableProps = {
      loading: false,
      items: data,
      sorting: { sort: { field: '@timestamp', direction: 'desc' } },
      pagination: { pageSize: 10, pageIndex: 1, totalItemCount: 0 },
      setTableOptions: jest.fn(),
    };

    render(
      <TestProvider>
        <FindingsTable {...props} />
      </TestProvider>
    );

    data.forEach((item) => {
      expect(screen.getByText(item.rule.name)).toBeInTheDocument();
    });
  });
});
