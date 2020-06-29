/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { GlobalSearchFindError } from './errors';

describe('GlobalSearchFindError', () => {
  describe('#invalidLicense', () => {
    it('create an error with the correct `type`', () => {
      const error = GlobalSearchFindError.invalidLicense('foobar');
      expect(error.message).toBe('foobar');
      expect(error.type).toBe('invalid-license');
    });

    it('can be identified via instanceof', () => {
      const error = GlobalSearchFindError.invalidLicense('foo');
      expect(error instanceof GlobalSearchFindError).toBe(true);
    });
  });
});
