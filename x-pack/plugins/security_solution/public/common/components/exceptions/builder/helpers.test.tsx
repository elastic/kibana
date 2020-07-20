/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { mount } from 'enzyme';
import moment from 'moment-timezone';

import {
  fields,
  getField,
} from '../../../../../../../../src/plugins/data/common/index_patterns/fields/fields.mocks.ts';
import { getFilteredIndexPatterns } from './helpers';
import { isOperator } from '../../autocomplete/operators';
import { FormattedBuilderEntry } from '../types';
import { IIndexPattern } from '../../../../../../../../src/plugins/data/common';

const getMockIndexPattern = (): IIndexPattern => ({
  id: '1234',
  title: 'logstash-*',
  fields,
});

const getMockNestedBuilderEntry = (): FormattedBuilderEntry => ({
  field: getField('nestedField.child'),
  operator: isOperator,
  value: 'some value',
  nested: 'child',
  parent: { parent: { field: 'nestedField' }, parentIndex: 0 },
  entryIndex: 0,
});

const getMockNestedParentBuilderEntry = (): FormattedBuilderEntry => ({
  field: { ...getField('nestedField.child'), name: 'nestedField', esTypes: ['nested'] },
  operator: isOperator,
  value: undefined,
  nested: 'parent',
  parent: undefined,
  entryIndex: 0,
});

describe('Exception builder helpers', () => {
  describe('#getFilteredIndexPatterns', () => {
    test('it returns nested fields that match parent value when "item.nested" is "child"', () => {
      const payloadIndexPattern: IIndexPattern = { ...getMockIndexPattern() };
      const payloadItem: FormattedBuilderEntry = { ...getMockNestedBuilderEntry() };
      const output = getFilteredIndexPatterns(payloadIndexPattern, payloadItem, false);
      const expected = {
        fields: [
          { ...getField('nestedField.child') },
          { ...getField('nestedField.nestedChild.doublyNestedChild') },
        ],
        id: '1234',
        title: 'logstash-*',
      };
      expect(output).toEqual(expected);
    });

    test('it returns only parent nested field when "item.nested" is "parent"', () => {
      const payloadIndexPattern: IIndexPattern = { ...getMockIndexPattern() };
      const payloadItem: FormattedBuilderEntry = { ...getMockNestedParentBuilderEntry() };
      const output = getFilteredIndexPatterns(payloadIndexPattern, payloadItem, false);
      const expected = {
        fields: [{ ...getField('nestedField.child'), name: 'nestedField', esTypes: ['nested'] }],
        id: '1234',
        title: 'logstash-*',
      };
      expect(output).toEqual(expected);
    });

    test('it returns only nested fields when "item.nested" is "parent" and no parent field yet specified', () => {
      const payloadIndexPattern: IIndexPattern = { ...getMockIndexPattern() };
      const payloadItem: FormattedBuilderEntry = {
        ...getMockNestedParentBuilderEntry(),
        field: undefined,
      };
      const output = getFilteredIndexPatterns(payloadIndexPattern, payloadItem, true);
      const expected = [];
      expect(output).toEqual(expected);
    });
  });
});
