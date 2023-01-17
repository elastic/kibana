/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, screen, within } from '@testing-library/react';
import * as TEST_SUBJECTS from '../test_subjects';
import { FindingsByResourceTable, getResourceId } from './findings_by_resource_table';
import type { PropsOf } from '@elastic/eui';
import Chance from 'chance';
import { TestProvider } from '../../../test/test_provider';
import type { FindingsByResourcePage } from './use_findings_by_resource';
import { calculatePostureScore } from '../../../../common/utils/helpers';

const chance = new Chance();

const getFakeFindingsByResource = (): FindingsByResourcePage => {
  const failed = chance.natural();
  const passed = chance.natural();
  const total = failed + passed;
  const [resourceName, resourceSubtype, ruleBenchmarkName, ...cisSections] = chance.unique(
    chance.word,
    5
  );

  return {
    cluster_id: chance.guid(),
    resource_id: chance.guid(),
    'resource.name': resourceName,
    'resource.sub_type': resourceSubtype,
    'rule.section': cisSections,
    'rule.benchmark.name': ruleBenchmarkName,
    compliance_score: passed / total,
    findings: {
      failed_findings: failed,
      passed_findings: passed,
      normalized: passed / total,
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
      sorting: {
        sort: { field: 'compliance_score', direction: 'desc' },
      },
      setTableOptions: jest.fn(),
      onAddFilter: jest.fn(),
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
      sorting: {
        sort: { field: 'compliance_score', direction: 'desc' },
      },
      setTableOptions: jest.fn(),
      onAddFilter: jest.fn(),
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
      if (item['resource.name'])
        expect(within(row).getByText(item['resource.name'])).toBeInTheDocument();
      if (item['resource.sub_type'])
        expect(within(row).getByText(item['resource.sub_type'])).toBeInTheDocument();
      expect(within(row).getByText(item['rule.section'].join(', '))).toBeInTheDocument();
      expect(
        within(row).getByText(
          `${calculatePostureScore(
            item.findings.passed_findings,
            item.findings.failed_findings
          ).toFixed(0)}%`
        )
      ).toBeInTheDocument();
    });
  });
});
