/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENVIRONMENT_ALL } from '../../../../common/environment_filter_values';
import { getQueryWithParams } from './get_query_with_params';

describe('correlations', () => {
  describe('getQueryWithParams', () => {
    it('returns the most basic query filtering on processor.event=transaction', () => {
      const query = getQueryWithParams({
        params: {
          index: 'apm-*',
          start: 1577836800000,
          end: 1609459200000,
          includeFrozen: false,
          environment: ENVIRONMENT_ALL.value,
          kuery: '',
        },
      });
      expect(query).toEqual({
        bool: {
          filter: [
            { term: { 'processor.event': 'transaction' } },
            {
              range: {
                '@timestamp': {
                  format: 'epoch_millis',
                  gte: 1577836800000,
                  lte: 1609459200000,
                },
              },
            },
          ],
        },
      });
    });

    it('returns a query considering additional params', () => {
      const query = getQueryWithParams({
        params: {
          index: 'apm-*',
          serviceName: 'actualServiceName',
          transactionName: 'actualTransactionName',
          start: 1577836800000,
          end: 1609459200000,
          environment: 'dev',
          kuery: '',
          includeFrozen: false,
        },
      });
      expect(query).toEqual({
        bool: {
          filter: [
            {
              term: {
                'processor.event': 'transaction',
              },
            },
            {
              range: {
                '@timestamp': {
                  format: 'epoch_millis',
                  gte: 1577836800000,
                  lte: 1609459200000,
                },
              },
            },
            {
              term: {
                'service.environment': 'dev',
              },
            },
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
          ],
        },
      });
    });

    it('returns a query considering a custom field/value pair', () => {
      const query = getQueryWithParams({
        params: {
          index: 'apm-*',
          start: 1577836800000,
          end: 1609459200000,
          includeFrozen: false,
          environment: ENVIRONMENT_ALL.value,
          kuery: '',
        },
        termFilters: [
          {
            fieldName: 'actualFieldName',
            fieldValue: 'actualFieldValue',
          },
        ],
      });
      expect(query).toEqual({
        bool: {
          filter: [
            { term: { 'processor.event': 'transaction' } },
            {
              range: {
                '@timestamp': {
                  format: 'epoch_millis',
                  gte: 1577836800000,
                  lte: 1609459200000,
                },
              },
            },
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
