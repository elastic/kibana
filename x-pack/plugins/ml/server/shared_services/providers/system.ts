/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { APICaller, KibanaRequest } from 'kibana/server';
import { SearchResponse, SearchParams } from 'elasticsearch';
import { MlServerLicense } from '../../lib/license';
import { CloudSetup } from '../../../../cloud/server';
import { LicenseCheck } from '../license_checks';
import { spacesUtilsProvider } from '../../lib/spaces_utils';
import { SpacesPluginSetup } from '../../../../spaces/server';
import { capabilitiesProvider } from '../../lib/capabilities';
import { MlInfoResponse } from '../../../common/types/ml_server_info';
import { ML_RESULTS_INDEX_PATTERN } from '../../../common/constants/index_patterns';
import { MlCapabilitiesResponse, ResolveMlCapabilities } from '../../../common/types/capabilities';

export interface MlSystemProvider {
  mlSystemProvider(
    callAsCurrentUser: APICaller,
    request: KibanaRequest
  ): {
    mlCapabilities(): Promise<MlCapabilitiesResponse>;
    mlInfo(): Promise<MlInfoResponse>;
    mlSearch<T>(searchParams: SearchParams): Promise<SearchResponse<T>>;
  };
}

export function getMlSystemProvider(
  isMinimumLicense: LicenseCheck,
  isFullLicense: LicenseCheck,
  mlLicense: MlServerLicense,
  spaces: SpacesPluginSetup | undefined,
  cloud: CloudSetup | undefined,
  resolveMlCapabilities: ResolveMlCapabilities
): MlSystemProvider {
  return {
    mlSystemProvider(callAsCurrentUser: APICaller, request: KibanaRequest) {
      return {
        async mlCapabilities() {
          isMinimumLicense();

          const { isMlEnabledInSpace } =
            spaces !== undefined
              ? spacesUtilsProvider(spaces, request)
              : { isMlEnabledInSpace: async () => true };

          const mlCapabilities = await resolveMlCapabilities(request);
          if (mlCapabilities === null) {
            throw new Error('resolveMlCapabilities is not defined');
          }

          const { getCapabilities } = capabilitiesProvider(
            callAsCurrentUser,
            mlCapabilities,
            mlLicense,
            isMlEnabledInSpace
          );
          return getCapabilities();
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
