/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTransactionType } from './apm_service_context';
import { createMemoryHistory } from 'history';

describe('getOrRedirectToTransactionType', () => {
  const history = createMemoryHistory();
  jest.spyOn(history, 'replace');

  describe('with transaction type in url', () => {
    it('returns the transaction type in the url ', () => {
      expect(
        getTransactionType({
          transactionTypes: ['worker', 'request', 'custom'],
          transactionType: 'custom',
          agentName: 'nodejs',
        })
      ).toBe('custom');
      expect(history.replace).not.toHaveBeenCalled();
    });

    it('updates the transaction type in the url when it is not one of the options returned by the API', () => {
      expect(
        getTransactionType({
          transactionTypes: ['worker', 'request'],
          transactionType: 'custom',
          agentName: 'nodejs',
        })
      ).toBe('request');
      expect(history.replace).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'transactionType=request',
        })
      );
    });
  });

  describe('with no transaction types', () => {
    it('returns undefined', () => {
      expect(
        getTransactionType({
          transactionTypes: [],
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
            agentName: 'nodejs',
          })
        ).toEqual('request');
        expect(history.replace).toHaveBeenCalledWith(
          expect.objectContaining({
            search: 'transactionType=request',
          })
        );
      });
    });

    describe('with no default transaction type', () => {
      it('returns the first type', () => {
        expect(
          getTransactionType({
            transactionTypes: ['worker', 'custom'],
            agentName: 'nodejs',
          })
        ).toEqual('worker');
        expect(history.replace).toHaveBeenCalledWith(
          expect.objectContaining({
            search: 'transactionType=worker',
          })
        );
      });
    });
  });

  describe('with a rum agent', () => {
    it('returns "page-load"', () => {
      expect(
        getTransactionType({
          transactionTypes: ['http-request', 'page-load'],
          agentName: 'js-base',
        })
      ).toEqual('page-load');
      expect(history.replace).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'transactionType=page-load',
        })
      );
    });
  });
});
