/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import type { Transaction } from '../../../../../typings/es_schemas/ui/transaction';
import { DiscoverTransactionLink, getDiscoverQuery } from './discover_transaction_link';
import mockTransaction from './__fixtures__/mock_transaction.json';
import { renderWithContext } from '../../../../utils/test_helpers';

jest.mock('../../../../hooks/use_adhoc_apm_data_view', () => ({
  useAdHocApmDataView: () => ({
    dataView: {
      id: 'apm_0',
      title: 'apm_0',
    },
  }),
}));

describe('DiscoverTransactionLink', () => {
  const transaction = mockTransaction as Transaction;

  it('renders link with correct query params', () => {
    renderWithContext(<DiscoverTransactionLink transaction={transaction} />);

    const link = screen.getByTestId('apmDiscoverLinkLink');
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', expect.stringContaining('transaction.id:'));
  });

  it('generates correct discover query params', () => {
    const queryParams = getDiscoverQuery(transaction);

    expect(queryParams).toMatchObject({
      _a: expect.objectContaining({
        interval: 'auto',
        query: {
          language: 'kuery',
          query: expect.stringContaining(
            'processor.event:"transaction" AND transaction.id:"8b60bd32ecc6e150" AND trace.id:"8b60bd32ecc6e1506735a8b6cfcf175c"'
          ),
        },
      }),
    });
  });
});
