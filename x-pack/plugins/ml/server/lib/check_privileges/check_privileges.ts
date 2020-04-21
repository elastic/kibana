/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IScopedClusterClient } from 'kibana/server';
import {
  MlCapabilities,
  getDefaultCapabilities,
  adminMlCapabilities,
  MlCapabilitiesResponse,
} from '../../../common/types/privileges';
import { upgradeCheckProvider } from './upgrade';
import { MlLicense } from '../../../common/license';

export function capabilitiesProvider(
  callAsCurrentUser: IScopedClusterClient['callAsCurrentUser'],
  mlCapabilities: MlCapabilities,
  mlLicense: MlLicense,
  isMlEnabledInSpace: () => Promise<boolean>,
  ignoreSpaces: boolean = false
) {
  const { isUpgradeInProgress } = upgradeCheckProvider(callAsCurrentUser);
  async function getCapabilities(): Promise<MlCapabilitiesResponse> {
    const upgradeInProgress = await isUpgradeInProgress();
    const isPlatinumOrTrialLicense = mlLicense.isFullLicense();
    const mlFeatureEnabledInSpace = await isMlEnabledInSpace();

    const basicMlCapabilities = {
      ...getDefaultCapabilities(),
      canFindFileStructure: mlCapabilities.canFindFileStructure,
    };

    const privileges = isPlatinumOrTrialLicense ? mlCapabilities : basicMlCapabilities;
    if (upgradeInProgress === true) {
      // if an upgrade is in progress, set all admin privileges to false
      disableAdminPrivileges(privileges);
    }

    return {
      capabilities: privileges,
      upgradeInProgress,
      isPlatinumOrTrialLicense,
      mlFeatureEnabledInSpace,
    };
  }
  return { getCapabilities };
}

function disableAdminPrivileges(capabilities: MlCapabilities) {
  Object.keys(adminMlCapabilities).forEach(k => {
    capabilities[k as keyof MlCapabilities] = false;
  });
}
