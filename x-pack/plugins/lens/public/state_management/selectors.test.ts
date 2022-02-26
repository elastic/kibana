/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LensAppState, selectApplyChangesCounter, selectChangesApplied } from '.';

describe('lens selectors', () => {
  describe('selecting changes applied', () => {
    it('should be true when flag is set', () => {
      const lensState = {
        changesApplied: true,
      } as Partial<LensAppState>;

      expect(selectChangesApplied({ lens: lensState as LensAppState })).toBeTruthy();
    });

    it('should be false when flag is not set', () => {
      const lensState = {
        changesApplied: false,
      } as Partial<LensAppState>;

      expect(selectChangesApplied({ lens: lensState as LensAppState })).toBeFalsy();
    });
  });
  it('should select apply changes counter', () => {
    expect(
      selectApplyChangesCounter({ lens: { applyChangesCounter: undefined } as LensAppState })
    ).toBe(0);
    expect(selectApplyChangesCounter({ lens: { applyChangesCounter: 21 } as LensAppState })).toBe(
      21
    );
  });
});
