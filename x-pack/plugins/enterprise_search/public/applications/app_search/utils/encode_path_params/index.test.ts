/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockUseParams } from '../../../__mocks__/react_router';

import { encodePathParams, generateEncodedPath, useDecodedParams } from '.';

describe('encodePathParams', () => {
  it('encodeURIComponent()s all object values', () => {
    const params = {
      someValue: 'hello world???',
      anotherValue: 'test!@#$%^&*[]/|;:"<>~`',
    };
    expect(encodePathParams(params)).toEqual({
      someValue: 'hello%20world%3F%3F%3F',
      anotherValue: 'test!%40%23%24%25%5E%26*%5B%5D%2F%7C%3B%3A%22%3C%3E~%60',
    });
  });
});

describe('generateEncodedPath', () => {
  it('generates a react router path with encoded path parameters', () => {
    expect(
      generateEncodedPath('/values/:someValue/:anotherValue/new', {
        someValue: 'hello world???',
        anotherValue: 'test!@#$%^&*[]/|;:"<>~`',
      })
    ).toEqual(
      '/values/hello%20world%3F%3F%3F/test!%40%23%24%25%5E%26*%5B%5D%2F%7C%3B%3A%22%3C%3E~%60/new'
    );
  });
});

describe('useDecodedParams', () => {
  it('decodeURIComponent()s all object values from useParams()', () => {
    mockUseParams.mockReturnValue({
      someValue: 'hello%20world%3F%3F%3F',
      anotherValue: 'test!%40%23%24%25%5E%26*%5B%5D%2F%7C%3B%3A%22%3C%3E~%60',
    });
    expect(useDecodedParams()).toEqual({
      someValue: 'hello world???',
      anotherValue: 'test!@#$%^&*[]/|;:"<>~`',
    });
  });
});
