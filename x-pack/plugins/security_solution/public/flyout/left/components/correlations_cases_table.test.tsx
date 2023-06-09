/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

import {
  CorrelationsCasesTable,
  type CorrelationsCasesTableProps,
} from './correlations_cases_table';
import { CaseStatuses, type RelatedCaseInfo } from '@kbn/cases-plugin/common/api';

describe('CorrelationsCasesTable', () => {
  const cases: RelatedCaseInfo[] = [
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

  it('renders the table correctly', () => {
    render(<CorrelationsCasesTable {...props} />);

    expect(screen.getByText('Case 1')).toBeInTheDocument();
    expect(screen.getByText('Case 2')).toBeInTheDocument();
  });
});
