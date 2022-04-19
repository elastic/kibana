/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, screen, within } from '@testing-library/react';
import * as TEST_SUBJECTS from './test_subjects';
import { FindingsByResourceTable } from './findings_by_resource_table';
import * as TEXT from './translations';
import type { PropsOf } from '@elastic/eui';
import Chance from 'chance';

const chance = new Chance();

const getFakeFindingsByResource = () => ({
  resource_id: chance.guid(),
  cluster_id: chance.guid(),
  cis_section: chance.word(),
  failed_findings: {
    total: chance.integer(),
    normalized: chance.integer({ min: 0, max: 1 }),
  },
});

type TableProps = PropsOf<typeof FindingsByResourceTable>;

describe('<FindingsByResourceTable />', () => {
  it('renders the zero state when status success and data has a length of zero ', async () => {
    const props: TableProps = {
      loading: false,
      data: { page: [], total: 0 },
      error: null,
    };

    render(<FindingsByResourceTable {...props} />);

    expect(screen.getByText(TEXT.NO_FINDINGS)).toBeInTheDocument();
  });

  it('renders the table with provided items', () => {
    const data = Array.from({ length: 10 }, getFakeFindingsByResource);

    const props: TableProps = {
      loading: false,
      data: { page: data, total: 10 },
      error: null,
    };

    const { container } = render(<FindingsByResourceTable {...props} />);

    data.forEach((item, i) => {
      const row = container.querySelector<HTMLElement>(
        `[data-test-subj="${TEST_SUBJECTS.FINDINGS_BY_RESOURCE_TABLE_ROW}"]:nth-child(${i + 1})`
      );
      if (!row) throw new Error('missing row');

      expect(within(row).getByText(item.resource_id)).toBeInTheDocument();
      expect(within(row).getByText(item.cluster_id)).toBeInTheDocument();
      expect(within(row).getByText(item.cis_section)).toBeInTheDocument();
    });
  });
});
