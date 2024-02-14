/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { firstValueFrom } from 'rxjs';
import type { LicensingPluginSetup } from '@kbn/licensing-plugin/server';
import type { allowedExperimentalValues } from '../../../../../common';
import { type ExperimentalFeatures } from '../../../../../common';
import type { AlertSuppressionCamel } from '../../../../../common/api/detection_engine/model/rule_schema';

export interface IsAlertSuppressionActiveParams {
  licensing: LicensingPluginSetup;
  experimentalFeatures?: ExperimentalFeatures;
  experimentalFeatureKey?: keyof typeof allowedExperimentalValues;
  alertSuppression?: AlertSuppressionCamel;
}

export const isAlertSuppressionActive = async ({
  licensing,
  experimentalFeatures,
  experimentalFeatureKey,
  alertSuppression,
}: IsAlertSuppressionActiveParams): Promise<boolean> => {
  if (!alertSuppression?.groupBy?.length) return false;

  const license = await firstValueFrom(licensing.license$);
  const hasPlatinumLicense = license.hasAtLeast('platinum');

  return experimentalFeatureKey
    ? !!(experimentalFeatures?.[experimentalFeatureKey] && hasPlatinumLicense)
    : hasPlatinumLicense;
};
