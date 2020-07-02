/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LegacyAPICaller, KibanaRequest } from 'kibana/server';
import { SearchResponse, SearchParams } from 'elasticsearch';
import { MlServerLicense } from '../../lib/license';
import { CloudSetup } from '../../../../cloud/server';
import { spacesUtilsProvider } from '../../lib/spaces_utils';
import { SpacesPluginSetup } from '../../../../spaces/server';
import { capabilitiesProvider } from '../../lib/capabilities';
import { MlInfoResponse } from '../../../common/types/ml_server_info';
import { ML_RESULTS_INDEX_PATTERN } from '../../../common/constants/index_patterns';
import { MlCapabilitiesResponse, ResolveMlCapabilities } from '../../../common/types/capabilities';
import { SharedServicesChecks } from '../shared_services';

export interface MlSystemProvider {
  mlSystemProvider(
    callAsCurrentUser: LegacyAPICaller,
    request: KibanaRequest
  ): {
    mlCapabilities(): Promise<MlCapabilitiesResponse>;
    mlInfo(): Promise<MlInfoResponse>;
    mlAnomalySearch<T>(searchParams: SearchParams): Promise<SearchResponse<T>>;
  };
}

export function getMlSystemProvider(
  { isMinimumLicense, isFullLicense, getHasMlCapabilities }: SharedServicesChecks,
  mlLicense: MlServerLicense,
  spaces: SpacesPluginSetup | undefined,
  cloud: CloudSetup | undefined,
  resolveMlCapabilities: ResolveMlCapabilities
): MlSystemProvider {
  return {
    mlSystemProvider(callAsCurrentUser: LegacyAPICaller, request: KibanaRequest) {
      // const hasMlCapabilities = getHasMlCapabilities(request);
      return {
        async mlCapabilities() {
          isMinimumLicense();

          const { isMlEnabledInSpace } =
            spaces !== undefined
              ? spacesUtilsProvider(spaces, request)
              : { isMlEnabledInSpace: async () => true };

          const mlCapabilities = await resolveMlCapabilities(request);
          if (mlCapabilities === null) {
            throw new Error('mlCapabilities is not defined');
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
        async mlAnomalySearch<T>(searchParams: SearchParams): Promise<SearchResponse<T>> {
          isFullLicense();
          // Removed while https://github.com/elastic/kibana/issues/64588 exists.
          // SIEM are calling this endpoint with a dummy request object from their alerting
          // integration and currently alerting does not supply a request object.
          // await hasMlCapabilities(['canAccessML']);

          return callAsCurrentUser('search', {
            ...searchParams,
            index: ML_RESULTS_INDEX_PATTERN,
          });
        },
      };
    },
  };
}
