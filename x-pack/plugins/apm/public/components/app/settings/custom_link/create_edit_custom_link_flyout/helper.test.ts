/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getSelectOptions,
  replaceTemplateVariables,
} from '../create_edit_custom_link_flyout/helper';
import { Transaction } from '../../../../../../typings/es_schemas/ui/transaction';

describe('Custom link helper', () => {
  describe('getSelectOptions', () => {
    it('returns all available options when no filters were selected', () => {
      expect(
        getSelectOptions(
          [
            { key: '', value: '' },
            { key: '', value: '' },
            { key: '', value: '' },
            { key: '', value: '' },
          ],
          ''
        )
      ).toEqual([
        { value: 'DEFAULT', text: 'Select field...' },
        { value: 'service.name', text: 'service.name' },
        { value: 'service.environment', text: 'service.environment' },
        { value: 'transaction.type', text: 'transaction.type' },
        { value: 'transaction.name', text: 'transaction.name' },
      ]);
    });
    it('removes item added in another filter', () => {
      expect(
        getSelectOptions(
          [
            { key: 'service.name', value: 'foo' },
            { key: '', value: '' },
            { key: '', value: '' },
            { key: '', value: '' },
          ],
          ''
        )
      ).toEqual([
        { value: 'DEFAULT', text: 'Select field...' },
        { value: 'service.environment', text: 'service.environment' },
        { value: 'transaction.type', text: 'transaction.type' },
        { value: 'transaction.name', text: 'transaction.name' },
      ]);
    });
    it('removes item added in another filter but keep the current selected', () => {
      expect(
        getSelectOptions(
          [
            { key: 'service.name', value: 'foo' },
            { key: 'transaction.name', value: 'bar' },
            { key: '', value: '' },
            { key: '', value: '' },
          ],
          'transaction.name'
        )
      ).toEqual([
        { value: 'DEFAULT', text: 'Select field...' },
        { value: 'service.environment', text: 'service.environment' },
        { value: 'transaction.type', text: 'transaction.type' },
        { value: 'transaction.name', text: 'transaction.name' },
      ]);
    });
    it('returns empty when all option were selected', () => {
      expect(
        getSelectOptions(
          [
            { key: 'service.name', value: 'foo' },
            { key: 'transaction.name', value: 'bar' },
            { key: 'service.environment', value: 'baz' },
            { key: 'transaction.type', value: 'qux' },
          ],
          ''
        )
      ).toEqual([{ value: 'DEFAULT', text: 'Select field...' }]);
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
        error:
          "We couldn't find a matching transaction document based on the defined filters.",
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
        replaceTemplateVariables(
          'https://elastic.co?service.name={{service.name}',
          transaction
        )
      ).toEqual({
        error:
          "We couldn't find an example transaction document due to invalid variable(s) defined.",
        formattedUrl: 'https://elastic.co?service.name={{service.name}',
      });
    });
  });
});
