/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Location } from 'history';
import React from 'react';
import { getRenderedHref } from '../../../../../utils/test_helpers';
import { TransactionDetailLink } from '.';

describe('TransactionDetailLink', () => {
  it('returns the correct url', async () => {
    const href = await getRenderedHref(
      () => (
        <TransactionDetailLink
          transactionName="bar"
          href="/basepath/app/apm/services/foo/transactions/view?traceId=baz&transactionId=123&transactionName=bar&transactionType=request&comparisonEnabled=true&offset=1w"
        >
          Transaction
        </TransactionDetailLink>
      ),
      {} as Location
    );

    expect(href).toMatchInlineSnapshot(
      '"/basepath/app/apm/services/foo/transactions/view?traceId=baz&transactionId=123&transactionName=bar&transactionType=request&comparisonEnabled=true&offset=1w"'
    );
  });
});
