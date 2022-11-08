/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRedirectToTransactionDetailPageUrl } from './get_redirect_to_transaction_detail_page_url';
import { parse } from 'url';

describe('getRedirectToTransactionDetailPageUrl', () => {
  const transaction = {
    '@timestamp': '2020-01-01T00:01:00.000Z',
    service: { name: 'opbeans-node' },
    trace: { id: 'trace_id' },
    transaction: {
      id: 'transaction_id',
      name: 'transaction_name',
      type: 'request',
      duration: { us: 5000 },
    },
  } as unknown as any;

  describe('without time range', () => {
    const url = getRedirectToTransactionDetailPageUrl({ transaction });

    it('rounds the start time down', () => {
      expect(parse(url, true).query.rangeFrom).toBe('2020-01-01T00:00:00.000Z');
    });

    it('rounds the end time up', () => {
      expect(parse(url, true).query.rangeTo).toBe('2020-01-01T00:05:00.000Z');
    });

    it('formats url correctly', () => {
      expect(url).toBe(
        '/services/opbeans-node/transactions/view?traceId=trace_id&transactionId=transaction_id&transactionName=transaction_name&transactionType=request&rangeFrom=2020-01-01T00%3A00%3A00.000Z&rangeTo=2020-01-01T00%3A05%3A00.000Z'
      );
    });
  });

  describe('with time range', () => {
    const url = getRedirectToTransactionDetailPageUrl({
      transaction,
      rangeFrom: '2020-01-01T00:02:00.000Z',
      rangeTo: '2020-01-01T00:17:59.999Z',
    });

    it('uses timerange provided', () => {
      expect(url).toBe(
        '/services/opbeans-node/transactions/view?traceId=trace_id&transactionId=transaction_id&transactionName=transaction_name&transactionType=request&rangeFrom=2020-01-01T00%3A02%3A00.000Z&rangeTo=2020-01-01T00%3A17%3A59.999Z'
      );
    });
  });
});
