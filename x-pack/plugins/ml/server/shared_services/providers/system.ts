/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { estypes } from '@elastic/elasticsearch';
import { KibanaRequest } from '../../../../../../src/core/server/http/router/request';
import type { SavedObjectsClientContract } from '../../../../../../src/core/server/saved_objects/types';
import type { CloudSetup } from '../../../../cloud/server/plugin';
import type { SpacesPluginStart } from '../../../../spaces/server/plugin';
import { MlLicense } from '../../../common/license/ml_license';
import type {
  MlCapabilitiesResponse,
  ResolveMlCapabilities,
} from '../../../common/types/capabilities';
import type { MlInfoResponse } from '../../../common/types/ml_server_info';
import { capabilitiesProvider } from '../../lib/capabilities/check_capabilities';
import { spacesUtilsProvider } from '../../lib/spaces_utils';
import type { GetGuards } from '../shared_services';

export interface MlSystemProvider {
  mlSystemProvider(
    request: KibanaRequest,
    savedObjectsClient: SavedObjectsClientContract
  ): {
    mlCapabilities(): Promise<MlCapabilitiesResponse>;
    mlInfo(): Promise<MlInfoResponse>;
    mlAnomalySearch<T>(searchParams: any, jobIds: string[]): Promise<estypes.SearchResponse<T>>;
  };
}

export function getMlSystemProvider(
  getGuards: GetGuards,
  mlLicense: MlLicense,
  getSpaces: (() => Promise<SpacesPluginStart>) | undefined,
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
              const { isMlEnabledInSpace } = spacesUtilsProvider(getSpaces, request);

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
          searchParams: any,
          jobIds: string[]
        ): Promise<estypes.SearchResponse<T>> {
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
