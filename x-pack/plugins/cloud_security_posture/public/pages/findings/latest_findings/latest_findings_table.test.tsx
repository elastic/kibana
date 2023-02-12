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
import { TestProvider } from '../../../test/test_provider';
import { getFindingsFixture } from '../../../test/fixtures/findings_fixture';

const chance = new Chance();

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
    const data = names.map(getFindingsFixture);

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
    const data = names.map(getFindingsFixture);

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
