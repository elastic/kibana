/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaRequest, SavedObjectsClientContract } from 'kibana/server';
import { SearchResponse } from 'elasticsearch';
import { RequestParams } from '@elastic/elasticsearch';
import { MlLicense } from '../../../common/license';
import { CloudSetup } from '../../../../cloud/server';
import { spacesUtilsProvider } from '../../lib/spaces_utils';
import { SpacesPluginSetup } from '../../../../spaces/server';
import { capabilitiesProvider } from '../../lib/capabilities';
import { MlInfoResponse } from '../../../common/types/ml_server_info';
import { MlCapabilitiesResponse, ResolveMlCapabilities } from '../../../common/types/capabilities';
import { GetGuards } from '../shared_services';

export interface MlSystemProvider {
  mlSystemProvider(
    request: KibanaRequest,
    savedObjectsClient: SavedObjectsClientContract
  ): {
    mlCapabilities(): Promise<MlCapabilitiesResponse>;
    mlInfo(): Promise<MlInfoResponse>;
    mlAnomalySearch<T>(
      searchParams: RequestParams.Search<any>,
      jobIds: string[]
    ): Promise<SearchResponse<T>>;
  };
}

export function getMlSystemProvider(
  getGuards: GetGuards,
  mlLicense: MlLicense,
  spaces: SpacesPluginSetup | undefined,
  cloud: CloudSetup | undefined,
  resolveMlCapabilities: ResolveMlCapabilities
): MlSystemProvider {
  return {
    mlSystemProvider(request: KibanaRequest, savedObjectsClient: SavedObjectsClientContract) {
      return {
        async mlCapabilities() {
          return await getGuards(request, savedObjectsClient)
            .isMinimumLicense()
            .ok(async ({ mlClient }) => {
              const { isMlEnabledInSpace } = spacesUtilsProvider(spaces, request);

              const mlCapabilities = await resolveMlCapabilities(request);
              if (mlCapabilities === null) {
                throw new Error('mlCapabilities is not defined');
              }

              const { getCapabilities } = capabilitiesProvider(
                mlClient,
                mlCapabilities,
                mlLicense,
                isMlEnabledInSpace
              );
              return getCapabilities();
            });
        },
        async mlInfo(): Promise<MlInfoResponse> {
          return await getGuards(request, savedObjectsClient)
            .isMinimumLicense()
            .ok(async ({ mlClient }) => {
              const { body: info } = await mlClient.info<MlInfoResponse>();
              const cloudId = cloud && cloud.cloudId;
              return {
                ...info,
                cloudId,
              };
            });
        },
        async mlAnomalySearch<T>(
          searchParams: RequestParams.Search<any>,
          jobIds: string[]
        ): Promise<SearchResponse<T>> {
          return await getGuards(request, savedObjectsClient)
            .isFullLicense()
            .hasMlCapabilities(['canAccessML'])
            .ok(async ({ mlClient }) => {
              const { body } = await mlClient.anomalySearch<T>(searchParams, jobIds);
              return body;
            });
        },
      };
    },
  };
}
