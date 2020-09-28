/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pick, transform, uniq } from 'lodash';
import { ILegacyClusterClient, KibanaRequest } from '../../../../../src/core/server';
import { GLOBAL_RESOURCE } from '../../common/constants';
import { ResourceSerializer } from './resource_serializer';
import {
  HasPrivilegesResponse,
  HasPrivilegesResponseApplication,
  CheckPrivilegesPayload,
  CheckPrivileges,
  CheckPrivilegesResponse,
} from './types';
import { validateEsPrivilegeResponse } from './validate_es_response';

interface CheckPrivilegesActions {
  login: string;
  version: string;
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
      privileges: CheckPrivilegesPayload
    ): Promise<CheckPrivilegesResponse> => {
      const kibanaPrivileges = Array.isArray(privileges.kibana)
        ? privileges.kibana
        : privileges.kibana
        ? [privileges.kibana]
        : [];
      const allApplicationPrivileges = uniq([actions.version, actions.login, ...kibanaPrivileges]);

      const hasPrivilegesResponse = (await clusterClient
        .asScoped(request)
        .callAsCurrentUser('shield.hasPrivileges', {
          body: {
            cluster: privileges.elasticsearch?.cluster,
            index: Object.entries(privileges.elasticsearch?.index ?? {}).map(
              ([names, indexPrivileges]) => ({
                names,
                privileges: indexPrivileges,
              })
            ),
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

      const clusterPrivilegesResponse = hasPrivilegesResponse.cluster ?? {};

      const clusterPrivileges = Object.entries(clusterPrivilegesResponse).map(
        ([privilege, authorized]) => ({
          privilege,
          authorized,
        })
      );

      const indexPrivileges = Object.entries(hasPrivilegesResponse.index ?? {}).reduce<
        CheckPrivilegesResponse['privileges']['elasticsearch']['index']
      >((acc, [index, indexResponse]) => {
        return {
          ...acc,
          [index]: Object.entries(indexResponse).map(([privilege, authorized]) => ({
            privilege,
            authorized,
          })),
        };
      }, {});

      if (hasIncompatibleVersion(applicationPrivilegesResponse)) {
        throw new Error(
          'Multiple versions of Kibana are running against the same Elasticsearch cluster, unable to authorize user.'
        );
      }

      // we need to filter out the non requested privileges from the response
      const resourcePrivileges = transform(applicationPrivilegesResponse, (result, value, key) => {
        result[key!] = pick(value, privileges.kibana ?? []);
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
        privileges: {
          kibana: privilegeArray,
          elasticsearch: {
            cluster: clusterPrivileges,
            index: indexPrivileges,
          },
        },
      };
    };

    return {
      async atSpace(spaceId: string, privileges: CheckPrivilegesPayload) {
        const spaceResource = ResourceSerializer.serializeSpaceResource(spaceId);
        return await checkPrivilegesAtResources([spaceResource], privileges);
      },
      async atSpaces(spaceIds: string[], privileges: CheckPrivilegesPayload) {
        const spaceResources = spaceIds.map((spaceId) =>
          ResourceSerializer.serializeSpaceResource(spaceId)
        );
        return await checkPrivilegesAtResources(spaceResources, privileges);
      },
      async globally(privileges: CheckPrivilegesPayload) {
        return await checkPrivilegesAtResources([GLOBAL_RESOURCE], privileges);
      },
    };
  };
}
