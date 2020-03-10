/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { APICaller } from 'src/core/server';
import { MlServerLicense } from '../../lib/license';
import { CloudSetup } from '../../../../cloud/server';
import { LicenseCheck } from '../license_checks';
import { spacesUtilsProvider, RequestFacade } from '../../lib/spaces_utils';
import { SpacesPluginSetup } from '../../../../spaces/server';
import { privilegesProvider, MlCapabilities } from '../../lib/check_privileges';
import { MlInfoResponse } from '../../../../../legacy/plugins/ml/common/types/ml_server_info';

export interface MlSystemProvider {
  mlSystemProvider(
    callAsCurrentUser: APICaller,
    request: RequestFacade
  ): {
    mlCapabilities(ignoreSpaces?: boolean): Promise<MlCapabilities>;
    mlInfo(): Promise<MlInfoResponse>;
  };
}

export function getMlSystemProvider(
  isMinimumLicense: LicenseCheck,
  mlLicense: MlServerLicense,
  spaces: SpacesPluginSetup | undefined,
  cloud: CloudSetup
): MlSystemProvider {
  return {
    mlSystemProvider(callAsCurrentUser: APICaller, request: RequestFacade) {
      return {
        mlCapabilities(ignoreSpaces?: boolean) {
          isMinimumLicense();

          const { isMlEnabledInSpace } =
            spaces !== undefined
              ? spacesUtilsProvider(spaces, request)
              : { isMlEnabledInSpace: async () => true };

          const { getPrivileges } = privilegesProvider(
            callAsCurrentUser,
            mlLicense,
            isMlEnabledInSpace,
            ignoreSpaces
          );
          return getPrivileges();
        },
        async mlInfo(): Promise<MlInfoResponse> {
          isMinimumLicense();
          const info = await callAsCurrentUser('ml.info');
          const cloudId = cloud && cloud.cloudId;
          return {
            ...info,
            cloudId,
          };
        },
      };
    },
  };
}
