/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LicensingPluginSetup } from '@kbn/licensing-plugin/server';

import { firstValueFrom } from 'rxjs';

import type { AlertSuppressionCamel } from '../../../../../common/api/detection_engine/model/rule_schema';

interface GetIsAlertSuppressionActiveParams {
  alertSuppression: AlertSuppressionCamel | undefined;
  isFeatureDisabled?: boolean | undefined;
  licensing: LicensingPluginSetup;
}

/**
 * checks if alert suppression is active:
 * - rule should have alert suppression config
 * - feature flag should not be disabled
 * - license should be platinum
 */
export const getIsAlertSuppressionActive = async ({
  licensing,
  alertSuppression,
  isFeatureDisabled = false,
}: GetIsAlertSuppressionActiveParams) => {
  if (isFeatureDisabled) {
    return false;
  }

  const isAlertSuppressionConfigured = Boolean(alertSuppression?.groupBy?.length);

  if (!isAlertSuppressionConfigured) {
    return false;
  }

  const license = await firstValueFrom(licensing.license$);
  const hasPlatinumLicense = license.hasAtLeast('platinum');

  return hasPlatinumLicense;
};
