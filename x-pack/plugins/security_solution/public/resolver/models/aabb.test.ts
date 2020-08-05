/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { isEqual } from './aabb';
import { AABB } from '../types';

describe('AABB', () => {
  const minimumX = 0;
  const minimumY = 0;
  const maximumX = 0;
  const maximumY = 0;

  let aabb: AABB;

  beforeEach(() => {
    aabb = { minimum: [minimumX, minimumY], maximum: [maximumX, maximumY] };
  });
  it('should be equal to an AABB with the same values', () => {
    expect(isEqual(aabb, { minimum: [minimumX, minimumY], maximum: [maximumX, maximumY] })).toBe(
      true
    );
  });

  it('should not be equal to an AABB with a different minimum X value', () => {
    expect(
      isEqual(aabb, { minimum: [minimumX + 1, minimumY], maximum: [maximumX, maximumY] })
    ).toBe(false);
  });
  it('should not be equal to an AABB with a different minimum Y value', () => {
    expect(
      isEqual(aabb, { minimum: [minimumX, minimumY + 1], maximum: [maximumX, maximumY] })
    ).toBe(false);
  });
  it('should not be equal to an AABB with a different maximum X value', () => {
    expect(
      isEqual(aabb, { minimum: [minimumX, minimumY], maximum: [maximumX + 1, maximumY] })
    ).toBe(false);
  });
  it('should not be equal to an AABB with a different maximum Y value', () => {
    expect(
      isEqual(aabb, { minimum: [minimumX, minimumY], maximum: [maximumX, maximumY + 1] })
    ).toBe(false);
  });
});
