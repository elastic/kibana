/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isUserActionTypeSupported } from './helpers';

describe('helpers', () => {
  describe('isUserActionTypeSupported', () => {
    const supportedTypes = [
      ['comment'],
      ['connector'],
      ['description'],
      ['pushed'],
      ['tags'],
      ['title'],
      ['status'],
    ];

    const unsupportedTypes = [['settings'], ['create_case'], ['delete_case']];

    it.each(supportedTypes)('should support type %s', (type) => {
      expect(isUserActionTypeSupported(type)).toBe(true);
    });

    it.each(unsupportedTypes)('should not support type %s ', (type) => {
      expect(isUserActionTypeSupported(type)).toBe(false);
    });
  });
});
