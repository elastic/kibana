/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getTransactionType } from './apm_service_context';

describe('getTransactionType', () => {
  describe('with transaction type in url', () => {
    it('returns the transaction type in the url ', () => {
      expect(
        getTransactionType({
          transactionTypes: ['worker', 'request'],
          urlParams: { transactionType: 'custom' },
          agentName: 'nodejs',
        })
      ).toBe('custom');
    });
  });

  describe('with no transaction types', () => {
    it('returns undefined', () => {
      expect(
        getTransactionType({
          transactionTypes: [],
          urlParams: {},
        })
      ).toBeUndefined();
    });
  });

  describe('with a non-rum agent', () => {
    describe('with default transaction type', () => {
      it('returns "request"', () => {
        expect(
          getTransactionType({
            transactionTypes: ['worker', 'request'],
            urlParams: {},
            agentName: 'nodejs',
          })
        ).toEqual('request');
      });
    });

    describe('with no default transaction type', () => {
      it('returns the first type', () => {
        expect(
          getTransactionType({
            transactionTypes: ['worker', 'custom'],
            urlParams: {},
            agentName: 'nodejs',
          })
        ).toEqual('worker');
      });
    });
  });

  describe('with a rum agent', () => {
    it('returns "page-load"', () => {
      expect(
        getTransactionType({
          transactionTypes: ['http-request', 'page-load'],
          urlParams: {},
          agentName: 'js-base',
        })
      ).toEqual('page-load');
    });
  });
});
