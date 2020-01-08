/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pick, transform, uniq } from 'lodash';
import { IClusterClient, KibanaRequest } from '../../../../../src/core/server';
import { GLOBAL_RESOURCE } from '../../common/constants';
import { ResourceSerializer } from './resource_serializer';
import { HasPrivilegesResponse, HasPrivilegesResponseApplication } from './types';
import { validateEsPrivilegeResponse } from './validate_es_response';

interface CheckPrivilegesActions {
  login: string;
  version: string;
}

interface CheckPrivilegesAtResourcesResponse {
  hasAllRequested: boolean;
  username: string;
  resourcePrivileges: {
    [resource: string]: {
      [privilege: string]: boolean;
    };
  };
}

export interface CheckPrivilegesAtResourceResponse {
  hasAllRequested: boolean;
  username: string;
  privileges: {
    [privilege: string]: boolean;
  };
}

export interface CheckPrivilegesAtSpacesResponse {
  hasAllRequested: boolean;
  username: string;
  spacePrivileges: {
    [spaceId: string]: {
      [privilege: string]: boolean;
    };
  };
}

export type CheckPrivilegesWithRequest = (request: KibanaRequest) => CheckPrivileges;

export interface CheckPrivileges {
  atSpace(
    spaceId: string,
    privilegeOrPrivileges: string | string[]
  ): Promise<CheckPrivilegesAtResourceResponse>;
  atSpaces(
    spaceIds: string[],
    privilegeOrPrivileges: string | string[]
  ): Promise<CheckPrivilegesAtSpacesResponse>;
  globally(privilegeOrPrivileges: string | string[]): Promise<CheckPrivilegesAtResourceResponse>;
}

export function checkPrivilegesWithRequestFactory(
  actions: CheckPrivilegesActions,
  clusterClient: IClusterClient,
  applicationName: string
) {
  const hasIncompatibleVersion = (
    applicationPrivilegesResponse: HasPrivilegesResponseApplication
  ) => {
    return Object.values(applicationPrivilegesResponse).some(
      resource => !resource[actions.version] && resource[actions.login]
    );
  };

  return function checkPrivilegesWithRequest(request: KibanaRequest): CheckPrivileges {
    const checkPrivilegesAtResources = async (
      resources: string[],
      privilegeOrPrivileges: string | string[]
    ): Promise<CheckPrivilegesAtResourcesResponse> => {
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

      return {
        hasAllRequested: hasPrivilegesResponse.has_all_requested,
        username: hasPrivilegesResponse.username,
        // we need to filter out the non requested privileges from the response
        resourcePrivileges: transform(applicationPrivilegesResponse, (result, value, key) => {
          result[key!] = pick(value, privileges);
        }),
      };
    };

    const checkPrivilegesAtResource = async (
      resource: string,
      privilegeOrPrivileges: string | string[]
    ) => {
      const { hasAllRequested, username, resourcePrivileges } = await checkPrivilegesAtResources(
        [resource],
        privilegeOrPrivileges
      );
      return {
        hasAllRequested,
        username,
        privileges: resourcePrivileges[resource],
      };
    };

    return {
      async atSpace(spaceId: string, privilegeOrPrivileges: string | string[]) {
        const spaceResource = ResourceSerializer.serializeSpaceResource(spaceId);
        return await checkPrivilegesAtResource(spaceResource, privilegeOrPrivileges);
      },
      async atSpaces(spaceIds: string[], privilegeOrPrivileges: string | string[]) {
        const spaceResources = spaceIds.map(spaceId =>
          ResourceSerializer.serializeSpaceResource(spaceId)
        );
        const { hasAllRequested, username, resourcePrivileges } = await checkPrivilegesAtResources(
          spaceResources,
          privilegeOrPrivileges
        );
        return {
          hasAllRequested,
          username,
          // we need to turn the resource responses back into the space ids
          spacePrivileges: transform(resourcePrivileges, (result, value, key) => {
            result[ResourceSerializer.deserializeSpaceResource(key!)] = value;
          }),
        };
      },
      async globally(privilegeOrPrivileges: string | string[]) {
        return await checkPrivilegesAtResource(GLOBAL_RESOURCE, privilegeOrPrivileges);
      },
    };
  };
}
