/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SecurityCreateApiKeyResponse } from '@elastic/elasticsearch/lib/api/types';
import Boom from '@hapi/boom';
import { ApmPluginRequestHandlerContext } from '../typings';
import { ClusterPrivilegeType } from '../../../common/privilege_type';

const resource = '*';
const CLUSTER_PRIVILEGES = [ClusterPrivilegeType.MANAGE_OWN_API_KEY];

export interface CreateAgentKeyResponse {
  agentKey: SecurityCreateApiKeyResponse;
}

export async function createAgentKey({
  context,
  requestBody,
}: {
  context: ApmPluginRequestHandlerContext;
  requestBody: {
    name: string;
    privileges: string[];
  };
}) {
  const { name, privileges } = requestBody;
  const application = {
    application: 'apm',
    privileges,
    resources: [resource],
  };
  const coreContext = await context.core;

  // Elasticsearch will allow a user without the right apm privileges to create API keys, but the keys won't validate
  // check first whether the user has the right privileges, and bail out early if not
  const {
    application: userApplicationPrivileges,
    username,
    has_all_requested: hasRequiredPrivileges,
    cluster: clusterPrivileges,
  } = await coreContext.elasticsearch.client.asCurrentUser.security.hasPrivileges(
    {
      body: {
        application: [application],
        cluster: CLUSTER_PRIVILEGES,
      },
    }
  );

  if (!hasRequiredPrivileges) {
    const missingPrivileges = Object.entries(
      userApplicationPrivileges.apm[resource]
    )
      .filter((x) => !x[1])
      .map((x) => x[0]);

    const missingClusterPrivileges = Object.keys(clusterPrivileges).filter(
      (key) => !clusterPrivileges[key]
    );

    const error = `${username} is missing the following requested privilege(s): ${missingPrivileges.join(
      ', '
    )}${
      missingClusterPrivileges && missingClusterPrivileges.length > 0
        ? ` and following cluster privileges - ${missingClusterPrivileges.join(
            ', '
          )} privilege(s)`
        : ''
    }.\
    You might try with the superuser, or add the missing APM application privileges to the role of the authenticated user, eg.:
    PUT /_security/role/my_role
    {
      ...
      "applications": [{
        "application": "apm",
        "privileges": ${JSON.stringify(missingPrivileges)},
        "resources": [${resource}]
      }],
      ...
    }`;
    throw Boom.forbidden(error, {
      missingPrivileges,
      missingClusterPrivileges,
    });
  }

  const body = {
    name,
    metadata: {
      application: 'apm',
    },
    role_descriptors: {
      apm: {
        cluster: [],
        index: [],
        applications: [application],
      },
    },
  };

  const agentKey =
    await coreContext.elasticsearch.client.asCurrentUser.security.createApiKey({
      body,
    });

  return {
    agentKey,
  };
}
