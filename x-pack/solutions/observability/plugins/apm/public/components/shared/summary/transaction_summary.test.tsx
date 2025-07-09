/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { TransactionSummary } from './transaction_summary';
import * as exampleTransactions from './__fixtures__/transactions';
import { renderWithContext } from '../../../utils/test_helpers';

describe('TransactionSummary', () => {
  it('renders HTTP transaction with request info', () => {
    const props = {
      errorCount: 0,
      totalDuration: 0,
      transaction: exampleTransactions.httpOk,
    };

    expect(() => renderWithContext(<TransactionSummary {...props} />)).not.toThrowError();
  });

  it('renders RUM transaction without request info', () => {
    const props = {
      errorCount: 0,
      totalDuration: 0,
      transaction: exampleTransactions.httpRumOK,
    };

    expect(() => renderWithContext(<TransactionSummary {...props} />)).not.toThrowError();
  });
});
