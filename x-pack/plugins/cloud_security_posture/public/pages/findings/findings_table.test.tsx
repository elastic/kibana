/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import * as TEST_SUBJECTS from './test_subjects';
import { FindingsTable } from './findings_table';
import type { PropsOf } from '@elastic/eui';
import Chance from 'chance';
import type { CspFinding } from './types';

const chance = new Chance();

const getFakeFindings = (name: string): CspFinding & { id: string } => ({
  id: chance.word(),
  result: {
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
    tags: [],
  },
  agent: {
    id: chance.string(),
    name: chance.string(),
    type: chance.string(),
    version: chance.string(),
  },
  resource: {
    filename: chance.string(),
    type: chance.string(),
    path: chance.string(),
    uid: chance.string(),
    mode: chance.string(),
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
      status: 'success',
      data: { data: [], total: 0 },
      error: null,
      sort: [],
      from: 1,
      size: 10,
      setQuery: jest.fn,
    };

    render(<FindingsTable {...props} />);

    expect(screen.getByTestId(TEST_SUBJECTS.FINDINGS_TABLE_ZERO_STATE)).toBeInTheDocument();
  });

  it('renders the table with provided items', () => {
    const names = chance.unique(chance.sentence, 10);
    const data = names.map(getFakeFindings);

    const props: TableProps = {
      status: 'success',
      data: { data, total: 10 },
      error: null,
      sort: [],
      from: 0,
      size: 10,
      setQuery: jest.fn,
    };

    render(<FindingsTable {...props} />);

    data.forEach((item) => {
      expect(screen.getByText(item.rule.name)).toBeInTheDocument();
    });
  });
});
