/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getValidThreat } from '../../../mitre/valid_threat_mock';
import { hasSubtechniqueOptions, isMitreAttackInvalid } from './helpers';

const mockTechniques = getValidThreat()[0].technique;

describe('helpers', () => {
  describe('isMitreAttackInvalid', () => {
    describe('when technique param is undefined', () => {
      it('returns false', () => {
        expect(isMitreAttackInvalid('', undefined)).toBe(false);
      });
    });

    describe('when technique param is empty', () => {
      it('returns false if tacticName is `none`', () => {
        expect(isMitreAttackInvalid('none', [])).toBe(false);
      });

      it('returns true if tacticName exists and is not `none`', () => {
        expect(isMitreAttackInvalid('Test', [])).toBe(true);
      });
    });

    describe('when technique param exists', () => {
      describe('and contains valid techniques', () => {
        const validTechniques = mockTechniques;
        it('returns false', () => {
          expect(isMitreAttackInvalid('Test', validTechniques)).toBe(false);
        });
      });

      describe('and contains empty techniques', () => {
        const emptyTechniques = [
          {
            reference: 'https://test.com',
            name: 'none',
            id: '',
          },
        ];
        it('returns true', () => {
          expect(isMitreAttackInvalid('Test', emptyTechniques)).toBe(true);
        });
      });
    });
  });

  describe('hasSubtechniqueOptions', () => {
    describe('when technique has subtechnique options', () => {
      const technique = mockTechniques[0];
      it('returns true', () => {
        expect(hasSubtechniqueOptions(technique)).toBe(true);
      });
    });

    describe('when technique has no subtechnique options', () => {
      const technique = {
        reference: 'https://test.com',
        name: 'Mock technique with no subtechniques',
        id: 'T0000',
        subtechnique: [],
      };
      it('returns false', () => {
        expect(hasSubtechniqueOptions(technique)).toBe(false);
      });
    });
  });
});
