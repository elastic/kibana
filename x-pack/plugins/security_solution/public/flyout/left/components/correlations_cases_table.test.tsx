/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { CaseDetailsLink } from '../../../common/components/links';

import {
  CorrelationsCasesTable,
  type CorrelationsCasesTableProps,
} from './correlations_cases_table';
import type { RelatedCase } from '@kbn/cases-plugin/common';
import { CaseStatuses } from '@kbn/cases-components';

jest.mock('../../../common/components/links', () => ({
  CaseDetailsLink: jest
    .fn()
    .mockImplementation(({ title }) => <>{`<CaseDetailsLink title="${title}" />`}</>),
}));

const cases: RelatedCase[] = [
  {
    id: 'case-1',
    title: 'Case 1',
    description: '',
    createdAt: '',
    totals: {
      alerts: 0,
      userComments: 0,
    },
    status: CaseStatuses.open,
  },
  {
    id: 'case-2',
    title: 'Case 2',
    description: '',
    createdAt: '',
    totals: {
      alerts: 0,
      userComments: 0,
    },
    status: CaseStatuses.open,
  },
];

const props: CorrelationsCasesTableProps = {
  cases,
};

describe('CorrelationsCasesTable', () => {
  it('renders the table correctly', () => {
    render(<CorrelationsCasesTable {...props} />);

    expect(CaseDetailsLink).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Case 1',
        detailName: 'case-1',
      }),
      expect.anything()
    );
  });
});
