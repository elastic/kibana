/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mockDetailItemData } from '../../mock/mock_detail_item';

import { getExampleText, getIconFromType } from './helpers';
import { mockBrowserFields } from '../../containers/source/mock';

const aField = {
  ...mockDetailItemData[4],
  ...mockBrowserFields.base.fields!['@timestamp'],
};

describe('helpers', () => {
  describe('getExampleText', () => {
    test('it returns the expected example text when the field contains an example', () => {
      expect(getExampleText(aField.example)).toEqual('Example: 2016-05-23T08:05:34.853Z');
    });

    test(`it returns an empty string when the field's example is an empty string`, () => {
      const fieldWithEmptyExample = {
        ...aField,
        example: '',
      };

      expect(getExampleText(fieldWithEmptyExample.example)).toEqual('');
    });
  });

  describe('getIconFromType', () => {
    [
      {
        type: 'keyword',
        expected: 'string',
      },
      {
        type: 'long',
        expected: 'number',
      },
      {
        type: 'date',
        expected: 'clock',
      },
      {
        type: 'ip',
        expected: 'globe',
      },
      {
        type: 'object',
        expected: 'questionInCircle',
      },
      {
        type: 'float',
        expected: 'number',
      },
      {
        type: 'anything else',
        expected: 'questionInCircle',
      },
    ].forEach(({ type, expected }) => {
      test(`it returns a ${expected} icon for type ${type}`, () =>
        expect(getIconFromType(type)).toEqual(expected));
    });
  });
});
