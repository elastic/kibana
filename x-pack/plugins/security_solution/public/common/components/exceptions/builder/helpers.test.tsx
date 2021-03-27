/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fields } from '../../../../../../../../src/plugins/data/common/index_patterns/fields/fields.mocks';
import { IFieldType, IIndexPattern } from '../../../../../../../../src/plugins/data/common';

import { filterIndexPatterns } from './helpers';

jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('123'),
}));

const getMockIndexPattern = (): IIndexPattern => ({
  id: '1234',
  title: 'logstash-*',
  fields,
});

const mockEndpointFields = [
  {
    name: 'file.path.caseless',
    type: 'string',
    esTypes: ['keyword'],
    count: 0,
    scripted: false,
    searchable: true,
    aggregatable: false,
    readFromDocValues: false,
  },
  {
    name: 'file.Ext.code_signature.status',
    type: 'string',
    esTypes: ['text'],
    count: 0,
    scripted: false,
    searchable: true,
    aggregatable: false,
    readFromDocValues: false,
    subType: { nested: { path: 'file.Ext.code_signature' } },
  },
];

export const getEndpointField = (name: string) =>
  mockEndpointFields.find((field) => field.name === name) as IFieldType;

describe('Exception builder helpers', () => {
  describe('#filterIndexPatterns', () => {
    test('it returns index patterns without filtering if list type is "detection"', () => {
      const mockIndexPatterns = getMockIndexPattern();
      const output = filterIndexPatterns(mockIndexPatterns, 'detection');

      expect(output).toEqual(mockIndexPatterns);
    });

    test('it returns filtered index patterns if list type is "endpoint"', () => {
      const mockIndexPatterns = {
        ...getMockIndexPattern(),
        fields: [...fields, ...mockEndpointFields],
      };
      const output = filterIndexPatterns(mockIndexPatterns, 'endpoint');

      expect(output).toEqual({ ...getMockIndexPattern(), fields: [...mockEndpointFields] });
    });
  });
});
