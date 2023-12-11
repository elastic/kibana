/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { extractTemplateVariableNames, getEncodedCustomLinkUrl } from '.';
import { Transaction } from '../../typings/es_schemas/ui/transaction';

describe('Custom link', () => {
  describe('extractTemplateVariableNames', () => {
    it('extracts variable names from a simple template', () => {
      const url = 'https://example.com/{{name}}/details';
      const result = extractTemplateVariableNames(url);
      expect(result).toEqual(['name']);
    });

    it('removes duplicates and only return unique template variable names', () => {
      const url = 'https://example.com/{{name}}/details/{{name}}';
      const result = extractTemplateVariableNames(url);
      expect(result).toEqual(['name']);
    });

    it('handles different variable names', () => {
      const url = 'https://example.com/{{name}}/details/{{age}}';
      const result = extractTemplateVariableNames(url);
      expect(result).toEqual(['name', 'age']);
    });

    it('handles complex template with multiple variables', () => {
      const url =
        'https://example.com/{{name}}/details/{{age}}?param={{gender}}';
      const result = extractTemplateVariableNames(url);
      expect(result).toEqual(['name', 'age', 'gender']);
    });

    it('handles templates with no variables', () => {
      const url = 'https://example.com/details';
      const result = extractTemplateVariableNames(url);
      expect(result).toEqual([]);
    });

    it('handles empty template', () => {
      const url = '';
      const result = extractTemplateVariableNames(url);
      expect(result).toEqual([]);
    });
  });
  describe('getEncodedCustomLinkUrl', () => {
    it('replaces variables in URL with encoded value', () => {
      const url =
        'https://kibana.com/app/apm/{{service.name}}/overview?transactionName={{transaction.name}}';
      const transaction = {
        service: { name: 'opbeans java' },
        transaction: {
          name: '#myhandler/foo',
        } as unknown as Transaction['transaction'],
      } as Transaction;
      const result = getEncodedCustomLinkUrl(url, transaction);
      expect(result).toBe(
        'https://kibana.com/app/apm/opbeans%20java/overview?transactionName=%23myhandler%2Ffoo'
      );
    });

    it('handles missing variable in URL', () => {
      const url = 'https://kibana.com/app/apm/';
      const transaction = { service: { name: 'opbeans java' } } as Transaction;
      const result = getEncodedCustomLinkUrl(url, transaction);
      expect(result).toBe(url);
    });

    it('handles empty URL', () => {
      const url = '';
      const transaction = { service: { name: 'opbeans java' } } as Transaction;
      const result = getEncodedCustomLinkUrl(url, transaction);
      expect(result).toBe(url);
    });

    it('handles missing transaction', () => {
      const url = 'https://kibana.com/app/apm/{{service.name}}/overview';
      const result = getEncodedCustomLinkUrl(url);
      expect(result).toBe('https://kibana.com/app/apm//overview');
    });

    it('handles non-string variable values', () => {
      const url =
        'https://kibana.com/app/apm/{{service.name}}/overview?duration={{transaction.duration}}';
      const transaction = {
        service: { name: 'foo' },
        transaction: { duration: 1 } as unknown as Transaction['transaction'],
      } as Transaction;
      const result = getEncodedCustomLinkUrl(url, transaction);
      expect(result).toBe('https://kibana.com/app/apm/foo/overview?duration=1');
    });

    it('handles non-URL-safe characters in variable values', () => {
      const url = 'https://kibana.com/app/apm/{{service.name}}/overview';
      const transaction = {
        service: { name: 'foo & bar' },
      } as Transaction;
      const result = getEncodedCustomLinkUrl(url, transaction);
      expect(result).toBe(
        'https://kibana.com/app/apm/foo%20%26%20bar/overview'
      );
    });
  });
});
