/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { hasSubtechniqueOptions, isMitreAttackInvalid, isMitreTechniqueInvalid } from './helpers';

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
        const validTechniques = [
          {
            reference: 'https://test.com',
            name: 'Audio Capture',
            id: 'T1123',
          },
        ];
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

  describe('isMitreTechniqueInvalid', () => {
    describe('when technique param is undefined', () => {
      it('returns false if tacticName is `none`', () => {
        expect(isMitreTechniqueInvalid('none', undefined)).toBe(false);
      });

      it('returns false if tacticName exists and is not `none`', () => {
        expect(isMitreTechniqueInvalid('Test', undefined)).toBe(false);
      });
    });

    describe('when technique param exists', () => {
      describe('and has possible subtechnique options', () => {
        describe('and contains at least one of those options', () => {
          const validTechnique = {
            reference: 'https://test.com',
            name: 'Archive Collected Data',
            id: 'T1560',
            subtechnique: [
              { reference: 'https://test.com', name: 'Archive via Library', id: 'T1560.002' },
            ],
          };
          it('returns false', () => {
            expect(isMitreTechniqueInvalid('Test', validTechnique)).toBe(false);
          });
        });

        describe("and doesn't contain any subtechniques", () => {
          const validTechnique = {
            reference: 'https://test.com',
            name: 'Archive Collected Data',
            id: 'T1560',
            subtechnique: [],
          };
          it('returns true', () => {
            expect(isMitreTechniqueInvalid('Test', validTechnique)).toBe(true);
          });
        });

        describe('and contains only empty subtechniques', () => {
          const validTechnique = {
            reference: 'https://test.com',
            name: 'Archive Collected Data',
            id: 'T1560',
            subtechnique: [{ reference: '', name: 'none', id: '' }],
          };
          it('returns true', () => {
            expect(isMitreTechniqueInvalid('Test', validTechnique)).toBe(true);
          });
        });
      });

      describe("and doesn't have possible subtechnique options", () => {
        const validTechnique = {
          reference: 'https://test.com',
          name: 'Audio Capture',
          id: 'T1123',
          subtechnique: [],
        };
        it('returns false', () => {
          expect(isMitreTechniqueInvalid('Test', validTechnique)).toBe(false);
        });
      });
    });
  });

  describe('hasSubtechniqueOptions', () => {
    describe('when technique has subtechnique options', () => {
      const technique = {
        reference: 'https://test.com',
        name: 'Archive Collected Data',
        id: 'T1560',
        subtechnique: [
          { reference: 'https://test.com', name: 'Archive via Library', id: 'T1560.002' },
        ],
      };
      it('returns true', () => {
        expect(hasSubtechniqueOptions(technique)).toBe(true);
      });
    });

    describe('when technique has no subtechnique options', () => {
      const technique = {
        reference: 'https://test.com',
        name: 'Audio Capture',
        id: 'T1123',
        subtechnique: [],
      };
      it('returns false', () => {
        expect(hasSubtechniqueOptions(technique)).toBe(false);
      });
    });
  });
});
