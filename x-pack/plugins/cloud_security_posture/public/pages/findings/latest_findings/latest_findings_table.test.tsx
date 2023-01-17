/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import userEvent from '@testing-library/user-event';
import { render, screen, within } from '@testing-library/react';
import * as TEST_SUBJECTS from '../test_subjects';
import { FindingsTable } from './latest_findings_table';
import type { PropsOf } from '@elastic/eui';
import Chance from 'chance';
import type { EcsEvent } from '@kbn/ecs';
import { TestProvider } from '../../../test/test_provider';
import { CspFinding } from '../../../../common/schemas/csp_finding';

const chance = new Chance();

const getFakeFindings = (name: string): CspFinding & { id: string } => ({
  cluster_id: chance.guid(),
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
    audit: chance.paragraph(),
    benchmark: {
      name: 'CIS Kubernetes',
      version: '1.6.0',
      id: 'cis_k8s',
    },
    default_value: chance.sentence(),
    description: chance.paragraph(),
    id: chance.guid(),
    impact: chance.word(),
    name,
    profile_applicability: chance.sentence(),
    rationale: chance.paragraph(),
    references: chance.paragraph(),
    rego_rule_id: 'cis_X_X_X',
    remediation: chance.word(),
    section: chance.sentence(),
    tags: [],
    version: '1.0',
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
  host: {} as any,
  ecs: {} as any,
  event: {} as EcsEvent,
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
      onAddFilter: jest.fn(),
    };

    render(
      <TestProvider>
        <FindingsTable {...props} />
      </TestProvider>
    );

    expect(
      screen.getByTestId(TEST_SUBJECTS.LATEST_FINDINGS_TABLE_NO_FINDINGS_EMPTY_STATE)
    ).toBeInTheDocument();
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
      onAddFilter: jest.fn(),
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

  it('adds filter with a cell button click', () => {
    const names = chance.unique(chance.sentence, 10);
    const data = names.map(getFakeFindings);

    const filterProps = { onAddFilter: jest.fn() };
    const props: TableProps = {
      loading: false,
      items: data,
      sorting: { sort: { field: '@timestamp', direction: 'desc' } },
      pagination: { pageSize: 10, pageIndex: 1, totalItemCount: 0 },
      setTableOptions: jest.fn(),
      ...filterProps,
    };

    render(
      <TestProvider>
        <FindingsTable {...props} />
      </TestProvider>
    );

    const row = data[0];

    const columns = [
      'result.evaluation',
      'resource.id',
      'resource.name',
      'resource.sub_type',
      'rule.rule_number',
      'rule.name',
    ];

    columns.forEach((field) => {
      const cellElement = screen.getByTestId(
        TEST_SUBJECTS.getFindingsTableCellTestId(field, row.resource.id)
      );
      userEvent.hover(cellElement);
      const addFilterElement = within(cellElement).getByTestId(
        TEST_SUBJECTS.FINDINGS_TABLE_CELL_ADD_FILTER
      );
      const addNegatedFilterElement = within(cellElement).getByTestId(
        TEST_SUBJECTS.FINDINGS_TABLE_CELL_ADD_NEGATED_FILTER
      );

      // We need to account for values like resource.id (deep.nested.values)
      const value = field.split('.').reduce<any>((a, c) => a[c], row);

      expect(addFilterElement).toBeVisible();
      expect(addNegatedFilterElement).toBeVisible();

      userEvent.click(addFilterElement);
      expect(props.onAddFilter).toHaveBeenCalledWith(field, value, false);

      userEvent.click(addNegatedFilterElement);
      expect(props.onAddFilter).toHaveBeenCalledWith(field, value, true);
    });
  });
});
