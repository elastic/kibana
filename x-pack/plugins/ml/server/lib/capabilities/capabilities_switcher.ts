/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';
import { firstValueFrom, Observable } from 'rxjs';
import { CapabilitiesSwitcher, CoreSetup, Logger } from 'src/core/server';
import { ILicense } from '../../../../licensing/common/types';
import { isFullLicense, isMinimumLicense, isMlEnabled } from '../../../common/license';
import { MlCapabilities, basicLicenseMlCapabilities } from '../../../common/types/capabilities';

export const setupCapabilitiesSwitcher = (
  coreSetup: CoreSetup,
  license$: Observable<ILicense>,
  logger: Logger
) => {
  coreSetup.capabilities.registerSwitcher(getSwitcher(license$, logger));
};

function getSwitcher(license$: Observable<ILicense>, logger: Logger): CapabilitiesSwitcher {
  return async (request, capabilities) => {
    const isAnonymousRequest = !request.route.options.authRequired;

    if (isAnonymousRequest) {
      return capabilities;
    }

    try {
      const license = await firstValueFrom(license$);
      const mlEnabled = isMlEnabled(license);

      // full license, leave capabilities as they were
      if (mlEnabled && isFullLicense(license)) {
        return capabilities;
      }

      const mlCaps = capabilities.ml as MlCapabilities;
      const originalCapabilities = cloneDeep(mlCaps);

      // not full licence, switch off all capabilities
      Object.keys(mlCaps).forEach((k) => {
        mlCaps[k as keyof MlCapabilities] = false;
      });

      // for a basic license, reapply the original capabilities for the basic license features
      if (mlEnabled && isMinimumLicense(license)) {
        basicLicenseMlCapabilities.forEach((c) => (mlCaps[c] = originalCapabilities[c]));
      }

      return capabilities;
    } catch (e) {
      logger.debug(`Error updating capabilities for ML based on licensing: ${e}`);
      return capabilities;
    }
  };
}
