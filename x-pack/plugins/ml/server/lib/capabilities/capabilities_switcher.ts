/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';
import { firstValueFrom, Observable } from 'rxjs';
import type { CapabilitiesSwitcher, CoreSetup, Logger } from '@kbn/core/server';
import type { ILicense } from '@kbn/licensing-plugin/common/types';
import { isFullLicense, isMinimumLicense, isMlEnabled } from '../../../common/license';
import {
  type MlCapabilities,
  basicLicenseMlCapabilities,
  featureCapabilities,
} from '../../../common/types/capabilities';
import type { MlFeatures } from '../../types';

export const setupCapabilitiesSwitcher = (
  coreSetup: CoreSetup,
  license$: Observable<ILicense>,
  enabledFeatures: MlFeatures,
  logger: Logger
) => {
  coreSetup.capabilities.registerSwitcher(getSwitcher(license$, logger, enabledFeatures));
};

function getSwitcher(
  license$: Observable<ILicense>,
  logger: Logger,
  enabledFeatures: MlFeatures
): CapabilitiesSwitcher {
  return async (request, capabilities) => {
    const isAnonymousRequest = !request.route.options.authRequired;
    if (isAnonymousRequest) {
      return {};
    }

    try {
      const license = await firstValueFrom(license$);
      const mlEnabled = isMlEnabled(license);

      const originalCapabilities = capabilities.ml as MlCapabilities;
      const mlCaps = cloneDeep(originalCapabilities);

      // full license, leave capabilities as they were
      if (mlEnabled && isFullLicense(license)) {
        return { ml: applyEnabledFeatures(mlCaps, enabledFeatures) };
      }

      // not full license, switch off all capabilities
      Object.keys(mlCaps).forEach((k) => {
        mlCaps[k as keyof MlCapabilities] = false;
      });

      // for a basic license, reapply the original capabilities for the basic license features
      if (mlEnabled && isMinimumLicense(license)) {
        basicLicenseMlCapabilities.forEach((c) => (mlCaps[c] = originalCapabilities[c]));
      }

      return { ml: applyEnabledFeatures(mlCaps, enabledFeatures) };
    } catch (e) {
      logger.debug(`Error updating capabilities for ML based on licensing: ${e}`);
      return {};
    }
  };
}

function applyEnabledFeatures(mlCaps: MlCapabilities, enabledFeatures: MlFeatures) {
  mlCaps.isADEnabled = enabledFeatures.ad;
  mlCaps.isDFAEnabled = enabledFeatures.dfa;
  mlCaps.isNLPEnabled = enabledFeatures.nlp;

  mlCaps.canViewMlNodes =
    mlCaps.canViewMlNodes && mlCaps.isADEnabled && mlCaps.isDFAEnabled && mlCaps.isNLPEnabled;

  if (enabledFeatures.ad === false) {
    featureCapabilities.ad.forEach((c) => (mlCaps[c] = false));
  }
  if (enabledFeatures.dfa === false) {
    featureCapabilities.dfa.forEach((c) => (mlCaps[c] = false));
  }
  if (enabledFeatures.nlp === false) {
    featureCapabilities.nlp.forEach((c) => (mlCaps[c] = false));
  }

  return mlCaps;
}
