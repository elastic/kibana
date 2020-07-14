/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { cloneDeep } from 'lodash';
import { Observable } from 'rxjs';
import { take } from 'rxjs/operators';
import { CapabilitiesSwitcher, CoreSetup, Logger } from 'src/core/server';
import { ILicense } from '../../../../licensing/common/types';
import { isFullLicense, isMinimumLicense } from '../../../common/license';
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
      const license = await license$.pipe(take(1)).toPromise();

      // full license, leave capabilities as they were
      if (isFullLicense(license)) {
        return capabilities;
      }

      const mlCaps = capabilities.ml as MlCapabilities;
      const originalCapabilities = cloneDeep(mlCaps);

      // not full licence, switch off all capabilities
      Object.keys(mlCaps).forEach((k) => {
        mlCaps[k as keyof MlCapabilities] = false;
      });

      // for a basic license, reapply the original capabilities for the basic license features
      if (isMinimumLicense(license)) {
        basicLicenseMlCapabilities.forEach((c) => (mlCaps[c] = originalCapabilities[c]));
      }

      return capabilities;
    } catch (e) {
      logger.debug(`Error updating capabilities for ML based on licensing: ${e}`);
      return capabilities;
    }
  };
}
