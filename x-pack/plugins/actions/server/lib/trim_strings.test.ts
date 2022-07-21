/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { trimStrings } from './trim_strings';

describe('trimStrings', () => {
  const action = {
    name: 'my name  ',
    actionTypeId: 'my-action-type',
    config: {
      param1: ' ',
    },
    secrets: {
      param1: [' ', 'secret '],
    },
  };

  it('returns a trimmed string', () => {
    expect(trimStrings(action.name)).toBe('my name');
  });

  it('returns trimmed strings in an object with arrays', () => {
    expect(trimStrings(action.secrets)).toStrictEqual({ param1: ['', 'secret'] });
  });

  it('returns trimmed strings in an object', () => {
    expect(trimStrings(action)).toStrictEqual({
      name: 'my name',
      actionTypeId: 'my-action-type',
      config: {
        param1: '',
      },
      secrets: {
        param1: ['', 'secret'],
      },
    });
  });
});
