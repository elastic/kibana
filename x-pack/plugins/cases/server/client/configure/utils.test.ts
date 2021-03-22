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
import { ConnectorTypes } from '../../../common/api/connectors';
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
    it(`if the preferredField is not required and another field is, use the other field`, () => {
      const result = createDefaultMapping(
        [
          { id: 'summary', name: 'Summary', required: false, type: 'text' },
          { id: 'title', name: 'Title', required: true, type: 'text' },
          { id: 'description', name: 'Description', required: false, type: 'text' },
        ],
        ConnectorTypes.jira
      );
      expect(result).toEqual(mappings[`${ConnectorTypes.jira}-alt`]);
    });
  });
});
