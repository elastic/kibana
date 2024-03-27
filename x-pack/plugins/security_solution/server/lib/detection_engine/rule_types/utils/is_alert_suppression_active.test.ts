/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { of } from 'rxjs';
import type { IsAlertSuppressionActiveParams } from './is_alert_suppression_active';
import { isAlertSuppressionActive } from './is_alert_suppression_active';
import type { ILicense } from '@kbn/licensing-plugin/server';

jest.mock('@kbn/licensing-plugin/server', () => ({
  LicensingPluginSetup: jest.fn(),
}));
const licensingMock = {
  license$: of({ hasAtLeast: jest.fn() }), // Use 'of' to create an observable
} as unknown as IsAlertSuppressionActiveParams['licensing'];

const experimentalFeatureKey = 'alertSuppressionForNonSequenceEqlRuleEnabled';
const experimentalFeaturesMock = {
  [experimentalFeatureKey]: true,
} as IsAlertSuppressionActiveParams['experimentalFeatures'];

const alertSuppressionMock = {
  groupBy: ['field1', 'field2'],
} as IsAlertSuppressionActiveParams['alertSuppression'];

describe('isAlertSuppressionActive', () => {
  it('should return true when groupBy field exists and platinum license is present', async () => {
    const licenseValue = (await licensingMock.license$.toPromise()) as ILicense;
    (licenseValue.hasAtLeast as jest.Mock).mockReturnValueOnce(true);

    const result = await isAlertSuppressionActive({
      licensing: licensingMock,
      experimentalFeatures: experimentalFeaturesMock,
      alertSuppression: alertSuppressionMock,
    });

    expect(result).toBe(true);
  });

  it('should return false when groupBy field does not exist', async () => {
    const result = await isAlertSuppressionActive({
      licensing: licensingMock,
      experimentalFeatures: experimentalFeaturesMock,
      alertSuppression: { groupBy: [] },
    });

    expect(result).toBe(false);
  });

  it('should return false when groupBy field exists but platinum license is not present', async () => {
    const licenseValue = (await licensingMock.license$.toPromise()) as ILicense;
    (licenseValue.hasAtLeast as jest.Mock).mockReturnValueOnce(false);

    const result = await isAlertSuppressionActive({
      licensing: licensingMock,
      experimentalFeatures: experimentalFeaturesMock,
      alertSuppression: alertSuppressionMock,
    });

    expect(result).toBe(false);
  });

  it('should return false when experimentalFeatureKey is provided but the feature is not enabled', async () => {
    const result = await isAlertSuppressionActive({
      licensing: licensingMock,
      experimentalFeatures: {
        [experimentalFeatureKey]: false,
      } as IsAlertSuppressionActiveParams['experimentalFeatures'],
      experimentalFeatureKey,
      alertSuppression: alertSuppressionMock,
    });

    expect(result).toBe(false);
  });

  it('should return true when experimentalFeatureKey is provided and the feature is enabled', async () => {
    const licenseValue = (await licensingMock.license$.toPromise()) as ILicense;
    (licenseValue.hasAtLeast as jest.Mock).mockReturnValueOnce(true);

    const result = await isAlertSuppressionActive({
      licensing: licensingMock,
      experimentalFeatures: experimentalFeaturesMock,
      experimentalFeatureKey,
      alertSuppression: alertSuppressionMock,
    });

    expect(result).toBe(true);
  });
  it('should return true when groupBy field exists and no experimentalFeature is provided', async () => {
    const licenseValue = (await licensingMock.license$.toPromise()) as ILicense;
    (licenseValue.hasAtLeast as jest.Mock).mockReturnValueOnce(true);

    const result = await isAlertSuppressionActive({
      licensing: licensingMock,
      alertSuppression: alertSuppressionMock,
    });

    expect(result).toBe(true);
  });
});
