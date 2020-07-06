/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LegacyAPICaller } from 'kibana/server';
import { getAdminCapabilities, getUserCapabilities } from './__mocks__/ml_capabilities';
import { capabilitiesProvider } from './check_capabilities';
import { MlLicense } from '../../../common/license';
import { getDefaultCapabilities } from '../../../common/types/capabilities';

const mlLicense = {
  isSecurityEnabled: () => true,
  isFullLicense: () => true,
} as MlLicense;

const mlLicenseBasic = {
  isSecurityEnabled: () => true,
  isFullLicense: () => false,
} as MlLicense;

const mlIsEnabled = async () => true;
const mlIsNotEnabled = async () => false;

const callWithRequestNonUpgrade = ((async () => ({
  upgrade_mode: false,
})) as unknown) as LegacyAPICaller;
const callWithRequestUpgrade = ((async () => ({
  upgrade_mode: true,
})) as unknown) as LegacyAPICaller;

describe('check_capabilities', () => {
  describe('getCapabilities() - right number of capabilities', () => {
    test('kibana capabilities count', async (done) => {
      const { getCapabilities } = capabilitiesProvider(
        callWithRequestNonUpgrade,
        getAdminCapabilities(),
        mlLicense,
        mlIsEnabled
      );
      const { capabilities } = await getCapabilities();
      const count = Object.keys(capabilities).length;
      expect(count).toBe(28);
      done();
    });
  });

  describe('getCapabilities() with security', () => {
    test('ml_user capabilities only', async (done) => {
      const { getCapabilities } = capabilitiesProvider(
        callWithRequestNonUpgrade,
        getUserCapabilities(),
        mlLicense,
        mlIsEnabled
      );
      const {
        capabilities,
        upgradeInProgress,
        mlFeatureEnabledInSpace,
        isPlatinumOrTrialLicense,
      } = await getCapabilities();
      expect(upgradeInProgress).toBe(false);
      expect(mlFeatureEnabledInSpace).toBe(true);
      expect(isPlatinumOrTrialLicense).toBe(true);

      expect(capabilities.canAccessML).toBe(true);
      expect(capabilities.canGetJobs).toBe(true);
      expect(capabilities.canGetDatafeeds).toBe(true);
      expect(capabilities.canGetCalendars).toBe(true);
      expect(capabilities.canFindFileStructure).toBe(true);
      expect(capabilities.canGetDataFrameAnalytics).toBe(true);
      expect(capabilities.canGetAnnotations).toBe(true);
      expect(capabilities.canCreateAnnotation).toBe(true);
      expect(capabilities.canDeleteAnnotation).toBe(true);

      expect(capabilities.canCreateJob).toBe(false);
      expect(capabilities.canDeleteJob).toBe(false);
      expect(capabilities.canOpenJob).toBe(false);
      expect(capabilities.canCloseJob).toBe(false);
      expect(capabilities.canForecastJob).toBe(false);
      expect(capabilities.canStartStopDatafeed).toBe(false);
      expect(capabilities.canUpdateJob).toBe(false);
      expect(capabilities.canCreateDatafeed).toBe(false);
      expect(capabilities.canDeleteDatafeed).toBe(false);
      expect(capabilities.canUpdateDatafeed).toBe(false);
      expect(capabilities.canPreviewDatafeed).toBe(false);
      expect(capabilities.canGetFilters).toBe(false);
      expect(capabilities.canCreateCalendar).toBe(false);
      expect(capabilities.canDeleteCalendar).toBe(false);
      expect(capabilities.canCreateFilter).toBe(false);
      expect(capabilities.canDeleteFilter).toBe(false);
      expect(capabilities.canDeleteDataFrameAnalytics).toBe(false);
      expect(capabilities.canCreateDataFrameAnalytics).toBe(false);
      expect(capabilities.canStartStopDataFrameAnalytics).toBe(false);
      done();
    });

    test('full capabilities', async (done) => {
      const { getCapabilities } = capabilitiesProvider(
        callWithRequestNonUpgrade,
        getAdminCapabilities(),
        mlLicense,
        mlIsEnabled
      );
      const {
        capabilities,
        upgradeInProgress,
        mlFeatureEnabledInSpace,
        isPlatinumOrTrialLicense,
      } = await getCapabilities();
      expect(upgradeInProgress).toBe(false);
      expect(mlFeatureEnabledInSpace).toBe(true);
      expect(isPlatinumOrTrialLicense).toBe(true);

      expect(capabilities.canAccessML).toBe(true);
      expect(capabilities.canGetJobs).toBe(true);
      expect(capabilities.canGetDatafeeds).toBe(true);
      expect(capabilities.canGetCalendars).toBe(true);
      expect(capabilities.canFindFileStructure).toBe(true);
      expect(capabilities.canGetDataFrameAnalytics).toBe(true);
      expect(capabilities.canGetAnnotations).toBe(true);
      expect(capabilities.canCreateAnnotation).toBe(true);
      expect(capabilities.canDeleteAnnotation).toBe(true);

      expect(capabilities.canCreateJob).toBe(true);
      expect(capabilities.canDeleteJob).toBe(true);
      expect(capabilities.canOpenJob).toBe(true);
      expect(capabilities.canCloseJob).toBe(true);
      expect(capabilities.canForecastJob).toBe(true);
      expect(capabilities.canStartStopDatafeed).toBe(true);
      expect(capabilities.canUpdateJob).toBe(true);
      expect(capabilities.canCreateDatafeed).toBe(true);
      expect(capabilities.canDeleteDatafeed).toBe(true);
      expect(capabilities.canUpdateDatafeed).toBe(true);
      expect(capabilities.canPreviewDatafeed).toBe(true);
      expect(capabilities.canGetFilters).toBe(true);
      expect(capabilities.canCreateCalendar).toBe(true);
      expect(capabilities.canDeleteCalendar).toBe(true);
      expect(capabilities.canCreateFilter).toBe(true);
      expect(capabilities.canDeleteFilter).toBe(true);
      expect(capabilities.canDeleteDataFrameAnalytics).toBe(true);
      expect(capabilities.canCreateDataFrameAnalytics).toBe(true);
      expect(capabilities.canStartStopDataFrameAnalytics).toBe(true);
      done();
    });

    test('upgrade in progress with full capabilities', async (done) => {
      const { getCapabilities } = capabilitiesProvider(
        callWithRequestUpgrade,
        getAdminCapabilities(),
        mlLicense,
        mlIsEnabled
      );
      const {
        capabilities,
        upgradeInProgress,
        mlFeatureEnabledInSpace,
        isPlatinumOrTrialLicense,
      } = await getCapabilities();
      expect(upgradeInProgress).toBe(true);
      expect(mlFeatureEnabledInSpace).toBe(true);
      expect(isPlatinumOrTrialLicense).toBe(true);

      expect(capabilities.canAccessML).toBe(true);
      expect(capabilities.canGetJobs).toBe(true);
      expect(capabilities.canGetDatafeeds).toBe(true);
      expect(capabilities.canGetCalendars).toBe(true);
      expect(capabilities.canFindFileStructure).toBe(true);
      expect(capabilities.canGetDataFrameAnalytics).toBe(true);
      expect(capabilities.canGetAnnotations).toBe(true);
      expect(capabilities.canCreateAnnotation).toBe(false);
      expect(capabilities.canDeleteAnnotation).toBe(false);

      expect(capabilities.canCreateJob).toBe(false);
      expect(capabilities.canDeleteJob).toBe(false);
      expect(capabilities.canOpenJob).toBe(false);
      expect(capabilities.canCloseJob).toBe(false);
      expect(capabilities.canForecastJob).toBe(false);
      expect(capabilities.canStartStopDatafeed).toBe(false);
      expect(capabilities.canUpdateJob).toBe(false);
      expect(capabilities.canCreateDatafeed).toBe(false);
      expect(capabilities.canDeleteDatafeed).toBe(false);
      expect(capabilities.canGetFilters).toBe(false);
      expect(capabilities.canUpdateDatafeed).toBe(false);
      expect(capabilities.canPreviewDatafeed).toBe(false);
      expect(capabilities.canCreateCalendar).toBe(false);
      expect(capabilities.canDeleteCalendar).toBe(false);
      expect(capabilities.canCreateFilter).toBe(false);
      expect(capabilities.canDeleteFilter).toBe(false);
      expect(capabilities.canDeleteDataFrameAnalytics).toBe(false);
      expect(capabilities.canCreateDataFrameAnalytics).toBe(false);
      expect(capabilities.canStartStopDataFrameAnalytics).toBe(false);
      done();
    });

    test('upgrade in progress with partial capabilities', async (done) => {
      const { getCapabilities } = capabilitiesProvider(
        callWithRequestUpgrade,
        getUserCapabilities(),
        mlLicense,
        mlIsEnabled
      );
      const {
        capabilities,
        upgradeInProgress,
        mlFeatureEnabledInSpace,
        isPlatinumOrTrialLicense,
      } = await getCapabilities();
      expect(upgradeInProgress).toBe(true);
      expect(mlFeatureEnabledInSpace).toBe(true);
      expect(isPlatinumOrTrialLicense).toBe(true);

      expect(capabilities.canAccessML).toBe(true);
      expect(capabilities.canGetJobs).toBe(true);
      expect(capabilities.canGetDatafeeds).toBe(true);
      expect(capabilities.canGetCalendars).toBe(true);
      expect(capabilities.canFindFileStructure).toBe(true);
      expect(capabilities.canGetDataFrameAnalytics).toBe(true);
      expect(capabilities.canGetAnnotations).toBe(true);
      expect(capabilities.canCreateAnnotation).toBe(false);
      expect(capabilities.canDeleteAnnotation).toBe(false);

      expect(capabilities.canCreateJob).toBe(false);
      expect(capabilities.canDeleteJob).toBe(false);
      expect(capabilities.canOpenJob).toBe(false);
      expect(capabilities.canCloseJob).toBe(false);
      expect(capabilities.canForecastJob).toBe(false);
      expect(capabilities.canStartStopDatafeed).toBe(false);
      expect(capabilities.canUpdateJob).toBe(false);
      expect(capabilities.canCreateDatafeed).toBe(false);
      expect(capabilities.canDeleteDatafeed).toBe(false);
      expect(capabilities.canUpdateDatafeed).toBe(false);
      expect(capabilities.canPreviewDatafeed).toBe(false);
      expect(capabilities.canGetFilters).toBe(false);
      expect(capabilities.canCreateCalendar).toBe(false);
      expect(capabilities.canDeleteCalendar).toBe(false);
      expect(capabilities.canCreateFilter).toBe(false);
      expect(capabilities.canDeleteFilter).toBe(false);
      expect(capabilities.canDeleteDataFrameAnalytics).toBe(false);
      expect(capabilities.canCreateDataFrameAnalytics).toBe(false);
      expect(capabilities.canStartStopDataFrameAnalytics).toBe(false);
      done();
    });

    test('full capabilities, ml disabled in space', async (done) => {
      const { getCapabilities } = capabilitiesProvider(
        callWithRequestNonUpgrade,
        getDefaultCapabilities(),
        mlLicense,
        mlIsNotEnabled
      );
      const {
        capabilities,
        upgradeInProgress,
        mlFeatureEnabledInSpace,
        isPlatinumOrTrialLicense,
      } = await getCapabilities();
      expect(upgradeInProgress).toBe(false);
      expect(mlFeatureEnabledInSpace).toBe(false);
      expect(isPlatinumOrTrialLicense).toBe(true);

      expect(capabilities.canAccessML).toBe(false);
      expect(capabilities.canGetJobs).toBe(false);
      expect(capabilities.canGetDatafeeds).toBe(false);
      expect(capabilities.canGetCalendars).toBe(false);
      expect(capabilities.canFindFileStructure).toBe(false);
      expect(capabilities.canGetDataFrameAnalytics).toBe(false);
      expect(capabilities.canGetAnnotations).toBe(false);
      expect(capabilities.canCreateAnnotation).toBe(false);
      expect(capabilities.canDeleteAnnotation).toBe(false);

      expect(capabilities.canCreateJob).toBe(false);
      expect(capabilities.canDeleteJob).toBe(false);
      expect(capabilities.canOpenJob).toBe(false);
      expect(capabilities.canCloseJob).toBe(false);
      expect(capabilities.canForecastJob).toBe(false);
      expect(capabilities.canStartStopDatafeed).toBe(false);
      expect(capabilities.canUpdateJob).toBe(false);
      expect(capabilities.canCreateDatafeed).toBe(false);
      expect(capabilities.canDeleteDatafeed).toBe(false);
      expect(capabilities.canUpdateDatafeed).toBe(false);
      expect(capabilities.canPreviewDatafeed).toBe(false);
      expect(capabilities.canGetFilters).toBe(false);
      expect(capabilities.canCreateCalendar).toBe(false);
      expect(capabilities.canDeleteCalendar).toBe(false);
      expect(capabilities.canCreateFilter).toBe(false);
      expect(capabilities.canDeleteFilter).toBe(false);
      expect(capabilities.canDeleteDataFrameAnalytics).toBe(false);
      expect(capabilities.canCreateDataFrameAnalytics).toBe(false);
      expect(capabilities.canStartStopDataFrameAnalytics).toBe(false);
      done();
    });
  });

  test('full capabilities, basic license, ml disabled in space', async (done) => {
    const { getCapabilities } = capabilitiesProvider(
      callWithRequestNonUpgrade,
      getDefaultCapabilities(),
      mlLicenseBasic,
      mlIsNotEnabled
    );
    const {
      capabilities,
      upgradeInProgress,
      mlFeatureEnabledInSpace,
      isPlatinumOrTrialLicense,
    } = await getCapabilities();

    expect(upgradeInProgress).toBe(false);
    expect(mlFeatureEnabledInSpace).toBe(false);
    expect(isPlatinumOrTrialLicense).toBe(false);

    expect(capabilities.canAccessML).toBe(false);
    expect(capabilities.canGetJobs).toBe(false);
    expect(capabilities.canGetDatafeeds).toBe(false);
    expect(capabilities.canGetCalendars).toBe(false);
    expect(capabilities.canFindFileStructure).toBe(false);
    expect(capabilities.canGetDataFrameAnalytics).toBe(false);
    expect(capabilities.canGetAnnotations).toBe(false);
    expect(capabilities.canCreateAnnotation).toBe(false);
    expect(capabilities.canDeleteAnnotation).toBe(false);

    expect(capabilities.canCreateJob).toBe(false);
    expect(capabilities.canDeleteJob).toBe(false);
    expect(capabilities.canOpenJob).toBe(false);
    expect(capabilities.canCloseJob).toBe(false);
    expect(capabilities.canForecastJob).toBe(false);
    expect(capabilities.canStartStopDatafeed).toBe(false);
    expect(capabilities.canUpdateJob).toBe(false);
    expect(capabilities.canCreateDatafeed).toBe(false);
    expect(capabilities.canDeleteDatafeed).toBe(false);
    expect(capabilities.canUpdateDatafeed).toBe(false);
    expect(capabilities.canPreviewDatafeed).toBe(false);
    expect(capabilities.canGetFilters).toBe(false);
    expect(capabilities.canCreateCalendar).toBe(false);
    expect(capabilities.canDeleteCalendar).toBe(false);
    expect(capabilities.canCreateFilter).toBe(false);
    expect(capabilities.canDeleteFilter).toBe(false);
    expect(capabilities.canDeleteDataFrameAnalytics).toBe(false);
    expect(capabilities.canCreateDataFrameAnalytics).toBe(false);
    expect(capabilities.canStartStopDataFrameAnalytics).toBe(false);
    done();
  });
});
