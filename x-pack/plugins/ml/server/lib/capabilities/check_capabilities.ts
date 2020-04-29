/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IScopedClusterClient } from 'kibana/server';
import {
  MlCapabilities,
  adminMlCapabilities,
  MlCapabilitiesResponse,
} from '../../../common/types/capabilities';
import { upgradeCheckProvider } from './upgrade';
import { MlLicense } from '../../../common/license';

export function capabilitiesProvider(
  callAsCurrentUser: IScopedClusterClient['callAsCurrentUser'],
  capabilities: MlCapabilities,
  mlLicense: MlLicense,
  isMlEnabledInSpace: () => Promise<boolean>
) {
  const { isUpgradeInProgress } = upgradeCheckProvider(callAsCurrentUser);
  async function getCapabilities(): Promise<MlCapabilitiesResponse> {
    const upgradeInProgress = await isUpgradeInProgress();
    const isPlatinumOrTrialLicense = mlLicense.isFullLicense();
    const mlFeatureEnabledInSpace = await isMlEnabledInSpace();

    if (upgradeInProgress === true) {
      // if an upgrade is in progress, set all admin capabilities to false
      disableAdminPrivileges(capabilities);
    }

    return {
      capabilities,
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
  capabilities.canCreateAnnotation = false;
  capabilities.canDeleteAnnotation = false;
}
