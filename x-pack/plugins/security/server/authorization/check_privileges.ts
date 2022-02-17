/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/types';
import { pick, transform, uniq } from 'lodash';

import type { IClusterClient, KibanaRequest } from 'src/core/server';

import { GLOBAL_RESOURCE } from '../../common/constants';
import { ResourceSerializer } from './resource_serializer';
import type {
  CheckPrivileges,
  CheckPrivilegesOptions,
  CheckPrivilegesPayload,
  CheckPrivilegesResponse,
  HasPrivilegesResponse,
  HasPrivilegesResponseApplication,
} from './types';
import { validateEsPrivilegeResponse } from './validate_es_response';

interface CheckPrivilegesActions {
  login: string;
  version: string;
}

export function checkPrivilegesWithRequestFactory(
  actions: CheckPrivilegesActions,
  getClusterClient: () => Promise<IClusterClient>,
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
      privileges: CheckPrivilegesPayload,
      { requireLoginAction = true }: CheckPrivilegesOptions = {}
    ): Promise<CheckPrivilegesResponse> => {
      const kibanaPrivileges = Array.isArray(privileges.kibana)
        ? privileges.kibana
        : privileges.kibana
        ? [privileges.kibana]
        : [];

      const allApplicationPrivileges = uniq([
        actions.version,
        ...(requireLoginAction ? [actions.login] : []),
        ...kibanaPrivileges,
      ]);

      const clusterClient = await getClusterClient();
      const body = await clusterClient.asScoped(request).asCurrentUser.security.hasPrivileges({
        body: {
          cluster: privileges.elasticsearch?.cluster as estypes.SecurityClusterPrivilege[],
          index: Object.entries(privileges.elasticsearch?.index ?? {}).map(
            ([name, indexPrivileges]) => ({
              names: [name],
              privileges: indexPrivileges as estypes.SecurityIndexPrivilege[],
            })
          ),
          application: [
            { application: applicationName, resources, privileges: allApplicationPrivileges },
          ],
        },
      });

      const hasPrivilegesResponse: HasPrivilegesResponse = body;

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
      async atSpace(
        spaceId: string,
        privileges: CheckPrivilegesPayload,
        options?: CheckPrivilegesOptions
      ) {
        const spaceResource = ResourceSerializer.serializeSpaceResource(spaceId);
        return await checkPrivilegesAtResources([spaceResource], privileges, options);
      },
      async atSpaces(
        spaceIds: string[],
        privileges: CheckPrivilegesPayload,
        options?: CheckPrivilegesOptions
      ) {
        const spaceResources = spaceIds.map((spaceId) =>
          ResourceSerializer.serializeSpaceResource(spaceId)
        );
        return await checkPrivilegesAtResources(spaceResources, privileges, options);
      },
      async globally(privileges: CheckPrivilegesPayload, options?: CheckPrivilegesOptions) {
        return await checkPrivilegesAtResources([GLOBAL_RESOURCE], privileges, options);
      },
    };
  };
}
