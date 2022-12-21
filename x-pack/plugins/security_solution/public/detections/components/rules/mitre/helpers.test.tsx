/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getValidThreat } from '../../../mitre/valid_threat_mock';
import { hasSubtechniqueOptions } from './helpers';

const mockTechniques = getValidThreat()[0].technique ?? [];

describe('helpers', () => {
  describe('hasSubtechniqueOptions', () => {
    describe('when technique has subtechnique options', () => {
      const technique = mockTechniques[0];
      it('returns true', async () => {
        expect(await hasSubtechniqueOptions(technique)).toBe(true);
      });
    });

    describe('when technique has no subtechnique options', () => {
      const technique = {
        reference: 'https://test.com',
        name: 'Mock technique with no subtechniques',
        id: 'T0000',
        subtechnique: [],
      };
      it('returns false', async () => {
        expect(await hasSubtechniqueOptions(technique)).toBe(false);
      });
    });
  });
});
