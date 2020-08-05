/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pick, transform, uniq } from 'lodash';
import { ILegacyClusterClient, KibanaRequest } from '../../../../../src/core/server';
import { GLOBAL_RESOURCE } from '../../common/constants';
import { ResourceSerializer } from './resource_serializer';
import { HasPrivilegesResponse, HasPrivilegesResponseApplication } from './types';
import { validateEsPrivilegeResponse } from './validate_es_response';

interface CheckPrivilegesActions {
  login: string;
  version: string;
}

export interface CheckPrivilegesResponse {
  hasAllRequested: boolean;
  username: string;
  privileges: Array<{
    /**
     * If this attribute is undefined, this element is a privilege for the global resource.
     */
    resource?: string;
    privilege: string;
    authorized: boolean;
  }>;
}

export type CheckPrivilegesWithRequest = (request: KibanaRequest) => CheckPrivileges;

export interface CheckPrivileges {
  atSpace(
    spaceId: string,
    privilegeOrPrivileges: string | string[]
  ): Promise<CheckPrivilegesResponse>;
  atSpaces(
    spaceIds: string[],
    privilegeOrPrivileges: string | string[]
  ): Promise<CheckPrivilegesResponse>;
  globally(privilegeOrPrivileges: string | string[]): Promise<CheckPrivilegesResponse>;
}

export function checkPrivilegesWithRequestFactory(
  actions: CheckPrivilegesActions,
  clusterClient: ILegacyClusterClient,
  applicationName: string
) {
  const hasIncompatibleVersion = (
    applicationPrivilegesResponse: HasPrivilegesResponseApplication
  ) => {
    return Object.values(applicationPrivilegesResponse).some(
      (resource) => !resource[actions.version] && resource[actions.login]
    );
  };

  return function checkPrivilegesWithRequest(request: KibanaRequest): CheckPrivileges {
    const checkPrivilegesAtResources = async (
      resources: string[],
      privilegeOrPrivileges: string | string[]
    ): Promise<CheckPrivilegesResponse> => {
      const privileges = Array.isArray(privilegeOrPrivileges)
        ? privilegeOrPrivileges
        : [privilegeOrPrivileges];
      const allApplicationPrivileges = uniq([actions.version, actions.login, ...privileges]);

      const hasPrivilegesResponse = (await clusterClient
        .asScoped(request)
        .callAsCurrentUser('shield.hasPrivileges', {
          body: {
            applications: [
              { application: applicationName, resources, privileges: allApplicationPrivileges },
            ],
          },
        })) as HasPrivilegesResponse;

      validateEsPrivilegeResponse(
        hasPrivilegesResponse,
        applicationName,
        allApplicationPrivileges,
        resources
      );

      const applicationPrivilegesResponse = hasPrivilegesResponse.application[applicationName];

      if (hasIncompatibleVersion(applicationPrivilegesResponse)) {
        throw new Error(
          'Multiple versions of Kibana are running against the same Elasticsearch cluster, unable to authorize user.'
        );
      }

      // we need to filter out the non requested privileges from the response
      const resourcePrivileges = transform(applicationPrivilegesResponse, (result, value, key) => {
        result[key!] = pick(value, privileges);
      }) as HasPrivilegesResponseApplication;
      const privilegeArray = Object.entries(resourcePrivileges)
        .map(([key, val]) => {
          // we need to turn the resource responses back into the space ids
          const resource =
            key !== GLOBAL_RESOURCE ? ResourceSerializer.deserializeSpaceResource(key!) : undefined;
          return Object.entries(val).map(([privilege, authorized]) => ({
            resource,
            privilege,
            authorized,
          }));
        })
        .flat();

      return {
        hasAllRequested: hasPrivilegesResponse.has_all_requested,
        username: hasPrivilegesResponse.username,
        privileges: privilegeArray,
      };
    };

    return {
      async atSpace(spaceId: string, privilegeOrPrivileges: string | string[]) {
        const spaceResource = ResourceSerializer.serializeSpaceResource(spaceId);
        return await checkPrivilegesAtResources([spaceResource], privilegeOrPrivileges);
      },
      async atSpaces(spaceIds: string[], privilegeOrPrivileges: string | string[]) {
        const spaceResources = spaceIds.map((spaceId) =>
          ResourceSerializer.serializeSpaceResource(spaceId)
        );
        return await checkPrivilegesAtResources(spaceResources, privilegeOrPrivileges);
      },
      async globally(privilegeOrPrivileges: string | string[]) {
        return await checkPrivilegesAtResources([GLOBAL_RESOURCE], privilegeOrPrivileges);
      },
    };
  };
}
