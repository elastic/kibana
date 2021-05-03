/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  JiraGetFieldsResponse,
  ResilientGetFieldsResponse,
  ServiceNowGetFieldsResponse,
} from '../../../../actions/server/types';
import { createDefaultMapping, formatFields } from './utils';
import { mappings, formatFieldsTestData } from './mock';

describe('client/configure/utils', () => {
  describe('formatFields', () => {
    formatFieldsTestData.forEach(({ expected, fields, type }) => {
      it(`normalizes ${type} fields to common type ConnectorField`, () => {
        const result = formatFields(fields, type);
        expect(result).toEqual(expected);
      });
    });
  });
  describe('createDefaultMapping', () => {
    formatFieldsTestData.forEach(({ expected, fields, type }) => {
      it(`normalizes ${type} fields to common type ConnectorField`, () => {
        const result = createDefaultMapping(expected, type);
        expect(result).toEqual(mappings[type]);
      });
    });
  });
});
