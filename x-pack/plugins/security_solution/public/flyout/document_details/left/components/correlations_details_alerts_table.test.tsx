/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { TestProviders } from '../../../../common/mock';
import { EuiBasicTable } from '@elastic/eui';
import { CorrelationsDetailsAlertsTable, columns } from './correlations_details_alerts_table';
import { usePaginatedAlerts } from '../hooks/use_paginated_alerts';

jest.mock('../hooks/use_paginated_alerts');
jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  EuiBasicTable: jest.fn(() => <div data-testid="mock-euibasictable" />),
}));

const TEST_ID = 'TEST';
const scopeId = 'scopeId';
const eventId = 'eventId';

describe('CorrelationsDetailsAlertsTable', () => {
  const alertIds = ['id1', 'id2', 'id3'];

  beforeEach(() => {
    jest.mocked(usePaginatedAlerts).mockReturnValue({
      setPagination: jest.fn(),
      setSorting: jest.fn(),
      data: [
        {
          _id: '1',
          _index: 'index',
          fields: {
            '@timestamp': ['2022-01-01'],
            'kibana.alert.rule.name': ['Rule1'],
            'kibana.alert.reason': ['Reason1'],
            'kibana.alert.severity': ['Severity1'],
          },
        },
        {
          _id: '1',
          _index: 'index',
          fields: {
            '@timestamp': ['2022-01-02'],
            'kibana.alert.rule.name': ['Rule2'],
            'kibana.alert.reason': ['Reason2'],
            'kibana.alert.severity': ['Severity2'],
          },
        },
      ],
      loading: false,
      paginationConfig: {
        pageIndex: 0,
        pageSize: 5,
        totalItemCount: 10,
        pageSizeOptions: [5, 10, 20],
      },
      sorting: { sort: { field: '@timestamp', direction: 'asc' }, enableAllColumns: true },
      error: false,
    });
  });

  it('renders EuiBasicTable with correct props', () => {
    const { getByTestId } = render(
      <TestProviders>
        <CorrelationsDetailsAlertsTable
          title={<p>{'title'}</p>}
          loading={false}
          alertIds={alertIds}
          scopeId={scopeId}
          eventId={eventId}
          data-test-subj={TEST_ID}
        />
      </TestProviders>
    );
    expect(getByTestId(`${TEST_ID}InvestigateInTimeline`)).toBeInTheDocument();

    expect(jest.mocked(usePaginatedAlerts)).toHaveBeenCalled();

    expect(jest.mocked(EuiBasicTable)).toHaveBeenCalledWith(
      expect.objectContaining({
        loading: false,
        items: [
          {
            '@timestamp': '2022-01-01',
            'kibana.alert.rule.name': 'Rule1',
            'kibana.alert.reason': 'Reason1',
            'kibana.alert.severity': 'Severity1',
          },
          {
            '@timestamp': '2022-01-02',
            'kibana.alert.rule.name': 'Rule2',
            'kibana.alert.reason': 'Reason2',
            'kibana.alert.severity': 'Severity2',
          },
        ],
        columns,
        pagination: { pageIndex: 0, pageSize: 5, totalItemCount: 10, pageSizeOptions: [5, 10, 20] },
        sorting: { sort: { field: '@timestamp', direction: 'asc' }, enableAllColumns: true },
      }),
      expect.anything()
    );
  });
});
