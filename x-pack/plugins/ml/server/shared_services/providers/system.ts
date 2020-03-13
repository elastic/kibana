/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { APICaller } from 'kibana/server';
import { SearchResponse, SearchParams } from 'elasticsearch';
import { MlServerLicense } from '../../lib/license';
import { CloudSetup } from '../../../../cloud/server';
import { LicenseCheck } from '../license_checks';
import { spacesUtilsProvider, RequestFacade } from '../../lib/spaces_utils';
import { SpacesPluginSetup } from '../../../../spaces/server';
import { privilegesProvider, MlCapabilities } from '../../lib/check_privileges';
import { MlInfoResponse } from '../../../common/types/ml_server_info';
import { ML_RESULTS_INDEX_PATTERN } from '../../../common/constants/index_patterns';

export interface MlSystemProvider {
  mlSystemProvider(
    callAsCurrentUser: APICaller,
    request: RequestFacade
  ): {
    mlCapabilities(ignoreSpaces?: boolean): Promise<MlCapabilities>;
    mlInfo(): Promise<MlInfoResponse>;
    mlSearch<T>(searchParams: SearchParams): Promise<SearchResponse<T>>;
  };
}

export function getMlSystemProvider(
  isMinimumLicense: LicenseCheck,
  isFullLicense: LicenseCheck,
  mlLicense: MlServerLicense,
  spaces: SpacesPluginSetup | undefined,
  cloud: CloudSetup | undefined
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
        async mlSearch<T>(searchParams: SearchParams): Promise<SearchResponse<T>> {
          isFullLicense();
          return callAsCurrentUser('search', {
            ...searchParams,
            index: ML_RESULTS_INDEX_PATTERN,
          });
        },
      };
    },
  };
}
