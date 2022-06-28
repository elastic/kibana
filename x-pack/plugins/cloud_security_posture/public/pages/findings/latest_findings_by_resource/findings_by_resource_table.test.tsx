/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, screen, within } from '@testing-library/react';
import * as TEST_SUBJECTS from '../test_subjects';
import { FindingsByResourceTable, formatNumber, getResourceId } from './findings_by_resource_table';
import type { PropsOf } from '@elastic/eui';
import Chance from 'chance';
import numeral from '@elastic/numeral';
import { TestProvider } from '../../../test/test_provider';
import type { FindingsByResourcePage } from './use_findings_by_resource';

const chance = new Chance();

const getFakeFindingsByResource = (): FindingsByResourcePage => {
  const count = chance.integer();
  const total = chance.integer() + count + 1;
  const normalized = count / total;

  const [resourceName, resourceSubtype, ...cisSections] = chance.unique(chance.word, 4);

  return {
    cluster_id: chance.guid(),
    resource_id: chance.guid(),
    resource_name: resourceName,
    resource_subtype: resourceSubtype,
    cis_sections: cisSections,
    failed_findings: {
      count,
      normalized,
      total_findings: total,
    },
  };
};

type TableProps = PropsOf<typeof FindingsByResourceTable>;

describe('<FindingsByResourceTable />', () => {
  it('renders the zero state when status success and data has a length of zero ', async () => {
    const props: TableProps = {
      loading: false,
      items: [],
      pagination: { pageIndex: 0, pageSize: 10, totalItemCount: 0 },
      setTableOptions: jest.fn(),
    };

    render(
      <TestProvider>
        <FindingsByResourceTable {...props} />
      </TestProvider>
    );

    expect(
      screen.getByTestId(TEST_SUBJECTS.FINDINGS_BY_RESOURCE_TABLE_NO_FINDINGS_EMPTY_STATE)
    ).toBeInTheDocument();
  });

  it('renders the table with provided items', () => {
    const data = Array.from({ length: 10 }, getFakeFindingsByResource);

    const props: TableProps = {
      loading: false,
      items: data,
      pagination: { pageIndex: 0, pageSize: 10, totalItemCount: 0 },
      setTableOptions: jest.fn(),
    };

    render(
      <TestProvider>
        <FindingsByResourceTable {...props} />
      </TestProvider>
    );

    data.forEach((item, i) => {
      const row = screen.getByTestId(
        TEST_SUBJECTS.getFindingsByResourceTableRowTestId(getResourceId(item))
      );
      expect(row).toBeInTheDocument();
      expect(within(row).getByText(item.resource_id)).toBeInTheDocument();
      if (item.resource_name) expect(within(row).getByText(item.resource_name)).toBeInTheDocument();
      if (item.resource_subtype)
        expect(within(row).getByText(item.resource_subtype)).toBeInTheDocument();
      expect(within(row).getByText(item.cis_sections.join(', '))).toBeInTheDocument();
      expect(within(row).getByText(formatNumber(item.failed_findings.count))).toBeInTheDocument();
      expect(
        within(row).getByText(new RegExp(numeral(item.failed_findings.normalized).format('0%')))
      ).toBeInTheDocument();
    });
  });
});
