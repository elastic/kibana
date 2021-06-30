/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getQueryWithParams } from './get_query_with_params';

describe('correlations', () => {
  describe('getQueryWithParams()', () => {
    it('returns the most basic query filtering on processor.event=transaction', () => {
      const query = getQueryWithParams({ params: { index: 'apm-*' } });
      expect(query).toEqual({
        bool: {
          filter: [{ term: { 'processor.event': 'transaction' } }],
        },
      });
    });

    it('returns a query considering additional params', () => {
      const query = getQueryWithParams({
        params: {
          index: 'apm-*',
          serviceName: 'actualServiceName',
          transactionName: 'actualTransactionName',
          start: '01-01-2021',
          end: '31-01-2021',
          environment: 'dev',
          percentileThresholdValue: 75,
        },
      });
      expect(query).toEqual({
        bool: {
          filter: [
            { term: { 'processor.event': 'transaction' } },
            {
              term: {
                'service.name': 'actualServiceName',
              },
            },
            {
              term: {
                'transaction.name': 'actualTransactionName',
              },
            },
            {
              range: {
                '@timestamp': {
                  gte: '01-01-2021',
                  lte: '31-01-2021',
                },
              },
            },
            {
              term: {
                'service.environment': 'dev',
              },
            },
            {
              range: {
                'transaction.duration.us': {
                  gte: 75,
                },
              },
            },
          ],
        },
      });
    });

    it('returns a query considering a custom field/value pair', () => {
      const query = getQueryWithParams({
        params: { index: 'apm-*' },
        fieldName: 'actualFieldName',
        fieldValue: 'actualFieldValue',
      });
      expect(query).toEqual({
        bool: {
          filter: [
            { term: { 'processor.event': 'transaction' } },
            {
              term: {
                actualFieldName: 'actualFieldValue',
              },
            },
          ],
        },
      });
    });
  });
});
