/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { KibanaRequest, SavedObjectsClientContract } from '@kbn/core/server';
import { CloudSetup } from '@kbn/cloud-plugin/server';
import { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import { MlLicense } from '../../../common/license';
import { spacesUtilsProvider } from '../../lib/spaces_utils';
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
              const info = await mlClient.info();
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
              return await mlClient.anomalySearch<T>(searchParams, jobIds);
            });
        },
      };
    },
  };
}
