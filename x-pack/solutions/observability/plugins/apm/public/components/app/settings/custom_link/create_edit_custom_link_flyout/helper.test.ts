/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSelectOptions, replaceTemplateVariables } from './helper';
import { Transaction } from '../../../../../../typings/es_schemas/ui/transaction';
import { Filter } from '../../../../../../common/custom_link/custom_link_types';

describe('Custom link helper', () => {
  describe('getSelectOptions', () => {
    const options = {
      default: { value: 'DEFAULT', text: 'Select field...' },
      serviceName: { value: 'service.name', text: 'service.name' },
      serviceEnvironment: { value: 'service.environment', text: 'service.environment' },
      transactionType: { value: 'transaction.type', text: 'transaction.type' },
      transactionName: { value: 'transaction.name', text: 'transaction.name' },
    };

    const filters: Record<string, Filter> = {
      empty: { key: '', value: '' },
      default: { key: 'DEFAULT' as Filter['key'], value: '' },
      serviceName: { key: 'service.name', value: 'foo' },
      serviceEnvironment: { key: 'service.environment', value: 'foo' },
      transactionType: { key: 'transaction.type', value: 'foo' },
      transactionName: { key: 'transaction.name', value: 'foo' },
    };

    it('returns all available options when no filters were selected', () => {
      expect(
        getSelectOptions([filters.empty, filters.empty, filters.empty, filters.empty], '')
      ).toEqual([
        options.default,
        options.serviceName,
        options.serviceEnvironment,
        options.transactionType,
        options.transactionName,
      ]);
    });

    it('removes item added in another filter', () => {
      expect(
        getSelectOptions([filters.serviceName, filters.empty, filters.empty, filters.empty], '')
      ).toEqual([
        options.default,
        options.serviceEnvironment,
        options.transactionType,
        options.transactionName,
      ]);
    });

    it('removes item added in another filter but keep the current selected', () => {
      expect(
        getSelectOptions(
          [filters.serviceName, filters.transactionName, filters.empty, filters.empty],
          filters.transactionName.key
        )
      ).toEqual([
        options.default,
        options.serviceEnvironment,
        options.transactionType,
        options.transactionName,
      ]);
    });

    it('returns empty when all option were selected', () => {
      expect(
        getSelectOptions(
          [
            filters.serviceName,
            filters.transactionName,
            filters.serviceEnvironment,
            filters.transactionType,
          ],
          ''
        )
      ).toEqual([options.default]);
    });

    it("does not remove item added if it's the default option", () => {
      expect(
        getSelectOptions([filters.serviceName, filters.empty, filters.empty], filters.default.key)
      ).toEqual([
        options.default,
        options.serviceEnvironment,
        options.transactionType,
        options.transactionName,
      ]);
    });
  });

  describe('replaceTemplateVariables', () => {
    const transaction = {
      service: { name: 'foo' },
      trace: { id: '123' },
    } as unknown as Transaction;

    it('replaces template variables', () => {
      expect(
        replaceTemplateVariables(
          'https://elastic.co?service.name={{service.name}}&trace.id={{trace.id}}',
          transaction
        )
      ).toEqual({
        error: undefined,
        formattedUrl: 'https://elastic.co?service.name=foo&trace.id=123',
      });
    });

    it('returns error when transaction is not defined', () => {
      const expectedResult = {
        error: "We couldn't find a matching transaction document based on the defined filters.",
        formattedUrl: 'https://elastic.co?service.name=&trace.id=',
      };
      expect(
        replaceTemplateVariables(
          'https://elastic.co?service.name={{service.name}}&trace.id={{trace.id}}'
        )
      ).toEqual(expectedResult);
      expect(
        replaceTemplateVariables(
          'https://elastic.co?service.name={{service.name}}&trace.id={{trace.id}}',
          {} as unknown as Transaction
        )
      ).toEqual(expectedResult);
    });

    it('returns error when could not replace variables', () => {
      expect(
        replaceTemplateVariables(
          'https://elastic.co?service.name={{service.nam}}&trace.id={{trace.i}}',
          transaction
        )
      ).toEqual({
        error:
          "We couldn't find a value match for {{service.nam}}, {{trace.i}} in the example transaction document.",
        formattedUrl: 'https://elastic.co?service.name=&trace.id=',
      });
    });

    it('returns error when variable is invalid', () => {
      expect(
        replaceTemplateVariables('https://elastic.co?service.name={{service.name}', transaction)
      ).toEqual({
        error:
          "We couldn't find an example transaction document due to invalid variable(s) defined.",
        formattedUrl: 'https://elastic.co?service.name={{service.name}',
      });
    });
  });
});
