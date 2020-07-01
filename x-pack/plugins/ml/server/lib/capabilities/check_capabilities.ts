/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LegacyAPICaller, KibanaRequest } from 'kibana/server';
import {
  MlCapabilities,
  adminMlCapabilities,
  MlCapabilitiesResponse,
  ResolveMlCapabilities,
  MlCapabilitiesKey,
} from '../../../common/types/capabilities';
import { upgradeCheckProvider } from './upgrade';
import { MlLicense } from '../../../common/license';

export function capabilitiesProvider(
  callAsCurrentUser: LegacyAPICaller,
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
  Object.keys(adminMlCapabilities).forEach((k) => {
    capabilities[k as keyof MlCapabilities] = false;
  });
  capabilities.canCreateAnnotation = false;
  capabilities.canDeleteAnnotation = false;
}

export type HasMlCapabilities = (capabilities: MlCapabilitiesKey[]) => Promise<void>;

export function hasMlCapabilitiesProvider(resolveMlCapabilities: ResolveMlCapabilities) {
  return (request: KibanaRequest): HasMlCapabilities => {
    return async (capabilities: MlCapabilitiesKey[]) => {
      const mlCapabilities = await resolveMlCapabilities(request);
      if (mlCapabilities === null) {
        throw Error('ML capabilities have not been initialized');
      }

      if (capabilities.every((c) => mlCapabilities[c] === true) === false) {
        throw Error('Insufficient privileges to access feature');
      }
    };
  };
}
