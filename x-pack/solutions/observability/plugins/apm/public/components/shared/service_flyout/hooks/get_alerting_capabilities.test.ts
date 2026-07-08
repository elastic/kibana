/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAlertingCapabilities } from './get_alerting_capabilities';

function makeCapabilities(apm: Record<string, boolean> = {}) {
  return { apm } as any;
}

describe('getAlertingCapabilities', () => {
  it('returns all true when both capabilities are granted', () => {
    expect(
      getAlertingCapabilities(makeCapabilities({ 'alerting:show': true, 'alerting:save': true }))
    ).toEqual({ canReadAlerts: true, canSaveAlerts: true, isAlertingAvailable: true });
  });

  it('returns isAlertingAvailable true when only alerting:show is granted', () => {
    expect(
      getAlertingCapabilities(makeCapabilities({ 'alerting:show': true, 'alerting:save': false }))
    ).toEqual({ canReadAlerts: true, canSaveAlerts: false, isAlertingAvailable: true });
  });

  it('returns isAlertingAvailable true when only alerting:save is granted', () => {
    expect(
      getAlertingCapabilities(makeCapabilities({ 'alerting:show': false, 'alerting:save': true }))
    ).toEqual({ canReadAlerts: false, canSaveAlerts: true, isAlertingAvailable: true });
  });

  it('returns all false when neither capability is granted', () => {
    expect(
      getAlertingCapabilities(makeCapabilities({ 'alerting:show': false, 'alerting:save': false }))
    ).toEqual({ canReadAlerts: false, canSaveAlerts: false, isAlertingAvailable: false });
  });

  it('returns all false when the apm capability namespace is missing', () => {
    expect(getAlertingCapabilities({} as any)).toEqual({
      canReadAlerts: false,
      canSaveAlerts: false,
      isAlertingAvailable: false,
    });
  });
});
