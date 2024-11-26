/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isErrorMessageWithLink } from './error_with_link';

describe('isErrorMessageWithLink', () => {
  it('should return true when error is an ErrorMessageWithLink', () => {
    const error = {
      link: 'http://example.com',
      errorMessage: 'An error occurred',
      linkText: 'decode_cef',
    };
    expect(isErrorMessageWithLink(error)).toBe(true);
  });

  it('should return false when error is a string', () => {
    const error = 'An error occurred';
    expect(isErrorMessageWithLink(error)).toBe(false);
  });

  it('should return false when error is null', () => {
    const error = null;
    expect(isErrorMessageWithLink(error)).toBe(false);
  });
});
