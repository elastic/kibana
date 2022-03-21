/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAdminCapabilities, getUserCapabilities } from './__mocks__/ml_capabilities';
import { capabilitiesProvider } from './check_capabilities';
import { MlLicense } from '../../../common/license';
import { getDefaultCapabilities } from '../../../common/types/capabilities';
import type { MlClient } from '../../lib/ml_client';

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

const mlClientNonUpgrade = {
  info: async () => ({
    upgrade_mode: false,
  }),
} as unknown as MlClient;

const mlClientUpgrade = {
  info: async () => ({
    upgrade_mode: true,
  }),
} as unknown as MlClient;

describe('check_capabilities', () => {
  describe('getCapabilities() - right number of capabilities', () => {
    test('kibana capabilities count', async () => {
      const { getCapabilities } = capabilitiesProvider(
        mlClientNonUpgrade,
        getAdminCapabilities(),
        mlLicense,
        mlIsEnabled
      );
      const { capabilities } = await getCapabilities();
      const count = Object.keys(capabilities).length;
      expect(count).toBe(36);
    });
  });

  describe('getCapabilities() with security', () => {
    test('ml_user capabilities only', async () => {
      const { getCapabilities } = capabilitiesProvider(
        mlClientNonUpgrade,
        getUserCapabilities(),
        mlLicense,
        mlIsEnabled
      );
      const { capabilities, upgradeInProgress, mlFeatureEnabledInSpace, isPlatinumOrTrialLicense } =
        await getCapabilities();
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
      expect(capabilities.canUseMlAlerts).toBe(true);
      expect(capabilities.canGetTrainedModels).toBe(true);

      expect(capabilities.canCreateJob).toBe(false);
      expect(capabilities.canDeleteJob).toBe(false);
      expect(capabilities.canOpenJob).toBe(false);
      expect(capabilities.canCloseJob).toBe(false);
      expect(capabilities.canResetJob).toBe(false);
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
      expect(capabilities.canCreateMlAlerts).toBe(false);
      expect(capabilities.canViewMlNodes).toBe(false);
      expect(capabilities.canCreateTrainedModels).toBe(false);
      expect(capabilities.canDeleteTrainedModels).toBe(false);
      expect(capabilities.canStartStopTrainedModels).toBe(false);
    });

    test('full capabilities', async () => {
      const { getCapabilities } = capabilitiesProvider(
        mlClientNonUpgrade,
        getAdminCapabilities(),
        mlLicense,
        mlIsEnabled
      );
      const { capabilities, upgradeInProgress, mlFeatureEnabledInSpace, isPlatinumOrTrialLicense } =
        await getCapabilities();
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
      expect(capabilities.canUseMlAlerts).toBe(true);
      expect(capabilities.canGetTrainedModels).toBe(true);

      expect(capabilities.canCreateJob).toBe(true);
      expect(capabilities.canDeleteJob).toBe(true);
      expect(capabilities.canOpenJob).toBe(true);
      expect(capabilities.canCloseJob).toBe(true);
      expect(capabilities.canResetJob).toBe(true);
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
      expect(capabilities.canCreateMlAlerts).toBe(true);
      expect(capabilities.canViewMlNodes).toBe(true);
      expect(capabilities.canCreateTrainedModels).toBe(true);
      expect(capabilities.canDeleteTrainedModels).toBe(true);
      expect(capabilities.canStartStopTrainedModels).toBe(true);
    });

    test('upgrade in progress with full capabilities', async () => {
      const { getCapabilities } = capabilitiesProvider(
        mlClientUpgrade,
        getAdminCapabilities(),
        mlLicense,
        mlIsEnabled
      );
      const { capabilities, upgradeInProgress, mlFeatureEnabledInSpace, isPlatinumOrTrialLicense } =
        await getCapabilities();
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
      expect(capabilities.canUseMlAlerts).toBe(false);
      expect(capabilities.canGetTrainedModels).toBe(true);

      expect(capabilities.canCreateJob).toBe(false);
      expect(capabilities.canDeleteJob).toBe(false);
      expect(capabilities.canOpenJob).toBe(false);
      expect(capabilities.canCloseJob).toBe(false);
      expect(capabilities.canResetJob).toBe(false);
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
      expect(capabilities.canCreateMlAlerts).toBe(false);
      expect(capabilities.canViewMlNodes).toBe(false);
      expect(capabilities.canCreateTrainedModels).toBe(false);
      expect(capabilities.canDeleteTrainedModels).toBe(false);
      expect(capabilities.canStartStopTrainedModels).toBe(false);
    });

    test('upgrade in progress with partial capabilities', async () => {
      const { getCapabilities } = capabilitiesProvider(
        mlClientUpgrade,
        getUserCapabilities(),
        mlLicense,
        mlIsEnabled
      );
      const { capabilities, upgradeInProgress, mlFeatureEnabledInSpace, isPlatinumOrTrialLicense } =
        await getCapabilities();
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
      expect(capabilities.canUseMlAlerts).toBe(false);
      expect(capabilities.canGetTrainedModels).toBe(true);

      expect(capabilities.canCreateJob).toBe(false);
      expect(capabilities.canDeleteJob).toBe(false);
      expect(capabilities.canOpenJob).toBe(false);
      expect(capabilities.canCloseJob).toBe(false);
      expect(capabilities.canResetJob).toBe(false);
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
      expect(capabilities.canCreateMlAlerts).toBe(false);
      expect(capabilities.canViewMlNodes).toBe(false);
      expect(capabilities.canCreateTrainedModels).toBe(false);
      expect(capabilities.canDeleteTrainedModels).toBe(false);
      expect(capabilities.canStartStopTrainedModels).toBe(false);
    });

    test('full capabilities, ml disabled in space', async () => {
      const { getCapabilities } = capabilitiesProvider(
        mlClientNonUpgrade,
        getDefaultCapabilities(),
        mlLicense,
        mlIsNotEnabled
      );
      const { capabilities, upgradeInProgress, mlFeatureEnabledInSpace, isPlatinumOrTrialLicense } =
        await getCapabilities();
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
      expect(capabilities.canUseMlAlerts).toBe(false);
      expect(capabilities.canGetTrainedModels).toBe(false);

      expect(capabilities.canCreateJob).toBe(false);
      expect(capabilities.canDeleteJob).toBe(false);
      expect(capabilities.canOpenJob).toBe(false);
      expect(capabilities.canCloseJob).toBe(false);
      expect(capabilities.canResetJob).toBe(false);
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
      expect(capabilities.canCreateMlAlerts).toBe(false);
      expect(capabilities.canViewMlNodes).toBe(false);
      expect(capabilities.canCreateTrainedModels).toBe(false);
      expect(capabilities.canDeleteTrainedModels).toBe(false);
      expect(capabilities.canStartStopTrainedModels).toBe(false);
    });
  });

  test('full capabilities, basic license, ml disabled in space', async () => {
    const { getCapabilities } = capabilitiesProvider(
      mlClientNonUpgrade,
      getDefaultCapabilities(),
      mlLicenseBasic,
      mlIsNotEnabled
    );
    const { capabilities, upgradeInProgress, mlFeatureEnabledInSpace, isPlatinumOrTrialLicense } =
      await getCapabilities();

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
    expect(capabilities.canUseMlAlerts).toBe(false);
    expect(capabilities.canGetTrainedModels).toBe(false);

    expect(capabilities.canCreateJob).toBe(false);
    expect(capabilities.canDeleteJob).toBe(false);
    expect(capabilities.canOpenJob).toBe(false);
    expect(capabilities.canCloseJob).toBe(false);
    expect(capabilities.canResetJob).toBe(false);
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
    expect(capabilities.canCreateMlAlerts).toBe(false);
    expect(capabilities.canViewMlNodes).toBe(false);
    expect(capabilities.canCreateTrainedModels).toBe(false);
    expect(capabilities.canDeleteTrainedModels).toBe(false);
    expect(capabilities.canStartStopTrainedModels).toBe(false);
  });
});
