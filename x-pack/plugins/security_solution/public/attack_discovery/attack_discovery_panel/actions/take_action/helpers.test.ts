/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOriginalAlertIds } from './helpers';

describe('helpers', () => {
  describe('getOriginalAlertIds', () => {
    const alertIds = ['alert1', 'alert2', 'alert3'];

    it('returns the original alertIds when no replacements are provided', () => {
      const result = getOriginalAlertIds({ alertIds });

      expect(result).toEqual(alertIds);
    });

    it('returns the replaced alertIds when replacements are provided', () => {
      const replacements = {
        alert1: 'replaced1',
        alert3: 'replaced3',
      };
      const expected = ['replaced1', 'alert2', 'replaced3'];

      const result = getOriginalAlertIds({ alertIds, replacements });

      expect(result).toEqual(expected);
    });

    it('returns the original alertIds when replacements are provided but no replacement is found', () => {
      const replacements = {
        alert4: 'replaced4',
        alert5: 'replaced5',
      };

      const result = getOriginalAlertIds({ alertIds, replacements });

      expect(result).toEqual(alertIds);
    });
  });
});
