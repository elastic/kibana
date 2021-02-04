/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isUrlInvalid } from '.';

describe('helpers', () => {
  describe('isUrlInvalid', () => {
    test('verifies invalid url', () => {
      expect(isUrlInvalid('this is not a url')).toBeTruthy();
    });

    test('verifies valid url', () => {
      expect(isUrlInvalid('https://www.elastic.co/')).toBeFalsy();
    });
  });
});
