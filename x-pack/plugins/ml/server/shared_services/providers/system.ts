/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaRequest } from 'kibana/server';
import { SearchResponse } from 'elasticsearch';
import { RequestParams } from '@elastic/elasticsearch';
import { MlServerLicense } from '../../lib/license';
import { CloudSetup } from '../../../../cloud/server';
import { spacesUtilsProvider } from '../../lib/spaces_utils';
import { SpacesPluginSetup } from '../../../../spaces/server';
import { capabilitiesProvider } from '../../lib/capabilities';
import { MlInfoResponse } from '../../../common/types/ml_server_info';
import { ML_RESULTS_INDEX_PATTERN } from '../../../common/constants/index_patterns';
import { MlCapabilitiesResponse, ResolveMlCapabilities } from '../../../common/types/capabilities';
import { GetGuards } from '../shared_services';

export interface MlSystemProvider {
  mlSystemProvider(
    request: KibanaRequest
  ): {
    mlCapabilities(): Promise<MlCapabilitiesResponse>;
    mlInfo(): Promise<MlInfoResponse>;
    mlAnomalySearch<T>(searchParams: RequestParams.Search<any>): Promise<SearchResponse<T>>;
  };
}

export function getMlSystemProvider(
  getGuards: GetGuards,
  mlLicense: MlServerLicense,
  spaces: SpacesPluginSetup | undefined,
  cloud: CloudSetup | undefined,
  resolveMlCapabilities: ResolveMlCapabilities
): MlSystemProvider {
  return {
    mlSystemProvider(request: KibanaRequest) {
      return {
        async mlCapabilities() {
          return await getGuards(request)
            .isMinimumLicense()
            .ok(async ({ scopedClient }) => {
              const { isMlEnabledInSpace } =
                spaces !== undefined
                  ? spacesUtilsProvider(spaces, request)
                  : { isMlEnabledInSpace: async () => true };

              const mlCapabilities = await resolveMlCapabilities(request);
              if (mlCapabilities === null) {
                throw new Error('mlCapabilities is not defined');
              }

              const { getCapabilities } = capabilitiesProvider(
                scopedClient,
                mlCapabilities,
                mlLicense,
                isMlEnabledInSpace
              );
              return getCapabilities();
            });
        },
        async mlInfo(): Promise<MlInfoResponse> {
          return await getGuards(request)
            .isMinimumLicense()
            .ok(async ({ scopedClient }) => {
              const { asInternalUser } = scopedClient;

              const { body: info } = await asInternalUser.ml.info<MlInfoResponse>();
              const cloudId = cloud && cloud.cloudId;
              return {
                ...info,
                cloudId,
              };
            });
        },
        async mlAnomalySearch<T>(
          searchParams: RequestParams.Search<any>
        ): Promise<SearchResponse<T>> {
          return await getGuards(request)
            .isFullLicense()
            .hasMlCapabilities(['canAccessML'])
            .ok(async ({ scopedClient }) => {
              const { asInternalUser } = scopedClient;
              const { body } = await asInternalUser.search<SearchResponse<T>>({
                ...searchParams,
                index: ML_RESULTS_INDEX_PATTERN,
              });
              return body;
            });
        },
      };
    },
  };
}
