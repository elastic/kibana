/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { hasVisibleChild } from '../utils';

describe('Profile Tree utils', () => {
  describe('#hasVisibleChild', () => {
    it('base case no children', () => {
      const op: any = { children: [] };
      expect(hasVisibleChild(op)).toBe(false);
    });

    it('base case with children', () => {
      const op: any = { children: [{ visible: false }, { visible: false }, { visible: true }] };
      expect(hasVisibleChild(op)).toBe(true);
    });

    it('is robust', () => {
      const op: any = {};
      expect(hasVisibleChild(op)).toBe(false);
    });
  });
});
