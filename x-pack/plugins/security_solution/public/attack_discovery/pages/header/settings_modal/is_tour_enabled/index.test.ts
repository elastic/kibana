/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getIsTourEnabled } from '.';

describe('getIsTourEnabled', () => {
  it('returns true when all conditions are met', () => {
    const result = getIsTourEnabled({
      connectorId: 'test-connector-id',
      isLoading: false,
      tourDelayElapsed: true,
      showSettingsTour: true,
    });

    expect(result).toBe(true);
  });

  it('returns false when isLoading is true', () => {
    const result = getIsTourEnabled({
      connectorId: 'test-connector-id',
      isLoading: true, // <-- don't show the tour during loading
      tourDelayElapsed: true,
      showSettingsTour: true,
    });

    expect(result).toBe(false);
  });

  it("returns false when connectorId is undefined because it hasn't loaded from storage", () => {
    const result = getIsTourEnabled({
      connectorId: undefined, // <-- don't show the tour if there is no connectorId
      isLoading: false,
      tourDelayElapsed: true,
      showSettingsTour: true,
    });

    expect(result).toBe(false);
  });

  it('returns false when tourDelayElapsed is false', () => {
    const result = getIsTourEnabled({
      connectorId: 'test-connector-id',
      isLoading: false,
      tourDelayElapsed: false, // <-- don't show the tour if the delay hasn't elapsed
      showSettingsTour: true,
    });

    expect(result).toBe(false);
  });

  it('returns false when showSettingsTour is false', () => {
    const result = getIsTourEnabled({
      connectorId: 'test-connector-id',
      isLoading: false,
      tourDelayElapsed: true,
      showSettingsTour: false, // <-- don't show the tour if it's disabled
    });

    expect(result).toBe(false);
  });

  it("returns false when showSettingsTour is undefined because it hasn't loaded from storage", () => {
    const result = getIsTourEnabled({
      connectorId: 'test-connector-id',
      isLoading: false,
      tourDelayElapsed: true,
      showSettingsTour: undefined, // <-- don't show the tour if it's undefined
    });

    expect(result).toBe(false);
  });
});
