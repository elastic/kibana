/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isTransformWizardFrequency } from './is_transform_wizard_frequency';

describe('isTransformWizardFrequency', () => {
  it('should fail when the input is not an integer and valid time unit.', () => {
    expect(isTransformWizardFrequency('0')).toBe(false);
    expect(isTransformWizardFrequency('0.1s')).toBe(false);
    expect(isTransformWizardFrequency('1.1m')).toBe(false);
    expect(isTransformWizardFrequency('10.1asdf')).toBe(false);
  });

  it('should only allow s/m/h as time unit.', () => {
    expect(isTransformWizardFrequency('1ms')).toBe(false);
    expect(isTransformWizardFrequency('1s')).toBe(true);
    expect(isTransformWizardFrequency('1m')).toBe(true);
    expect(isTransformWizardFrequency('1h')).toBe(true);
    expect(isTransformWizardFrequency('1d')).toBe(false);
  });

  it('should only allow values above 0 and up to 1 hour.', () => {
    expect(isTransformWizardFrequency('0s')).toBe(false);
    expect(isTransformWizardFrequency('1s')).toBe(true);
    expect(isTransformWizardFrequency('3599s')).toBe(true);
    expect(isTransformWizardFrequency('3600s')).toBe(true);
    expect(isTransformWizardFrequency('3601s')).toBe(false);
    expect(isTransformWizardFrequency('10000s')).toBe(false);

    expect(isTransformWizardFrequency('0m')).toBe(false);
    expect(isTransformWizardFrequency('1m')).toBe(true);
    expect(isTransformWizardFrequency('59m')).toBe(true);
    expect(isTransformWizardFrequency('60m')).toBe(true);
    expect(isTransformWizardFrequency('61m')).toBe(false);
    expect(isTransformWizardFrequency('100m')).toBe(false);

    expect(isTransformWizardFrequency('0h')).toBe(false);
    expect(isTransformWizardFrequency('1h')).toBe(true);
    expect(isTransformWizardFrequency('2h')).toBe(false);
  });
});
