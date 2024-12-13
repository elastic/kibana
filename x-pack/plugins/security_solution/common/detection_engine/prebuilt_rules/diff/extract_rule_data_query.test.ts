/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KqlQueryType } from '../../../api/detection_engine';
import {
  extractRuleEqlQuery,
  extractRuleEsqlQuery,
  extractRuleKqlQuery,
} from './extract_rule_data_query';

describe('extract rule data queries', () => {
  describe('extractRuleKqlQuery', () => {
    it('extracts a trimmed version of the query field for inline query types', () => {
      const extractedKqlQuery = extractRuleKqlQuery('\nevent.kind:alert\n', 'kuery', [], undefined);

      expect(extractedKqlQuery).toEqual({
        type: KqlQueryType.inline_query,
        query: 'event.kind:alert',
        language: 'kuery',
        filters: [],
      });
    });
  });

  describe('extractRuleEqlQuery', () => {
    it('extracts a trimmed version of the query field', () => {
      const extractedEqlQuery = extractRuleEqlQuery('\n\nquery where true\n\n', 'eql', []);

      expect(extractedEqlQuery).toEqual({
        query: 'query where true',
        language: 'eql',
        filters: [],
      });
    });
  });

  describe('extractRuleEsqlQuery', () => {
    it('extracts a trimmed version of the query field', () => {
      const extractedEsqlQuery = extractRuleEsqlQuery('\nFROM * where true\t\n', 'esql');

      expect(extractedEsqlQuery).toEqual({
        query: 'FROM * where true',
        language: 'esql',
      });
    });
  });
});
