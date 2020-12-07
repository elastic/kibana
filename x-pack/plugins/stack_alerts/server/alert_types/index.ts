/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Logger } from 'src/core/server';
import { AlertingSetup, StackAlertsStartDeps } from '../types';
import { register as registerIndexThreshold } from './index_threshold';
import { register as registerGeoThreshold } from './geo_threshold';
import { register as registerGeoContainment } from './geo_containment';
import { LicensingPluginSetup } from '../../../licensing/server';
import { STACK_ALERTS_FEATURE_ID } from '../../common';

interface RegisterAlertTypesParams {
  logger: Logger;
  data: Promise<StackAlertsStartDeps['triggersActionsUi']['data']>;
  alerts: AlertingSetup;
}

export function registerBuiltInAlertTypes(
  params: RegisterAlertTypesParams & { licensing: LicensingPluginSetup }
) {
  params.licensing.license$.subscribe((license) => {
    const { state } = license.check(STACK_ALERTS_FEATURE_ID, 'gold');
    const hasGoldLicense = state === 'valid';
    if (hasGoldLicense) {
      registerGeoThreshold(params);
      registerGeoContainment(params);
    }
    registerIndexThreshold(params);
  });
}
