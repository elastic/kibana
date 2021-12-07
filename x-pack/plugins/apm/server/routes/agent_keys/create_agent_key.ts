/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { ApmPluginRequestHandlerContext } from '../typings';
import { CreateApiKeyResponse } from '../../../common/agent_key_types';

const enum PrivilegeType {
  SOURCEMAP = 'sourcemap:write',
  EVENT = 'event:write',
  AGENT_CONFIG = 'config_agent:read',
}

interface SecurityHasPrivilegesResponse {
  application: {
    apm: {
      '-': {
        [PrivilegeType.SOURCEMAP]: boolean;
        [PrivilegeType.EVENT]: boolean;
        [PrivilegeType.AGENT_CONFIG]: boolean;
      };
    };
  };
  has_all_requested: boolean;
  username: string;
}

export async function createAgentKey({
  context,
  requestBody,
}: {
  context: ApmPluginRequestHandlerContext;
  requestBody: {
    name: string;
    sourcemap?: boolean;
    event?: boolean;
    agentConfig?: boolean;
  };
}) {
  // Elasticsearch will allow a user without the right apm privileges to create API keys, but the keys won't validate
  // check first whether the user has the right privileges, and bail out early if not
  const {
    body: { application, username, has_all_requested: hasRequiredPrivileges },
  } = await context.core.elasticsearch.client.asCurrentUser.security.hasPrivileges<SecurityHasPrivilegesResponse>(
    {
      body: {
        application: [
          {
            application: 'apm',
            privileges: [
              PrivilegeType.SOURCEMAP,
              PrivilegeType.EVENT,
              PrivilegeType.AGENT_CONFIG,
            ],
            resources: ['-'],
          },
        ],
      },
    }
  );

  if (!hasRequiredPrivileges) {
    const missingPrivileges = Object.entries(application.apm['-'])
      .filter((x) => !x[1])
      .map((x) => x[0])
      .join(', ');
    const error = `${username} is missing the following requested privilege(s): ${missingPrivileges}.\
    You might try with the superuser, or add the APM application privileges to the role of the authenticated user, eg.:
    PUT /_security/role/my_role {
      ...
      "applications": [{
        "application": "apm",
        "privileges": ["sourcemap:write", "event:write", "config_agent:read"],
        "resources": ["*"]
      }],
      ...
    }`;
    throw Boom.internal(error);
  }

  const { name = 'apm-key', sourcemap, event, agentConfig } = requestBody;

  const privileges: PrivilegeType[] = [];
  if (!sourcemap && !event && !agentConfig) {
    privileges.push(
      PrivilegeType.SOURCEMAP,
      PrivilegeType.EVENT,
      PrivilegeType.AGENT_CONFIG
    );
  }

  if (sourcemap) {
    privileges.push(PrivilegeType.SOURCEMAP);
  }

  if (event) {
    privileges.push(PrivilegeType.EVENT);
  }

  if (agentConfig) {
    privileges.push(PrivilegeType.AGENT_CONFIG);
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
        applications: [
          {
            application: 'apm',
            privileges,
            resources: ['*'],
          },
        ],
      },
    },
  };

  const { body: agentKey } =
    await context.core.elasticsearch.client.asCurrentUser.security.createApiKey<CreateApiKeyResponse>(
      {
        body,
      }
    );

  return {
    agentKey,
  };
}
