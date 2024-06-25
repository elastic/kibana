/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getExampleText, getIconFromType } from './helpers';

describe('helpers', () => {
  describe('getExampleText', () => {
    test('it returns the expected example text when the field contains an example', () => {
      expect(getExampleText('2016-05-23T08:05:34.853Z')).toEqual(
        'Example: 2016-05-23T08:05:34.853Z'
      );
    });

    test(`it returns an empty string when the field's example is an empty string`, () => {
      expect(getExampleText('')).toEqual('');
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
