/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/* eslint-disable no-console */

import { Role } from '../../../../security/common/model';
import { callKibana, isAxiosError } from '../call_kibana';
import { Elasticsearch } from '../create_kibana_user_role';

type Privilege = [] | ['read'] | ['all'];
export interface KibanaPrivileges {
  base?: Privilege;
  feature?: Record<string, Privilege>;
}

export type RoleType = Omit<Role, 'name' | 'metadata'>;

export async function createRole({
  elasticsearch,
  kibanaHostname,
  roleName,
  role,
}: {
  elasticsearch: Elasticsearch;
  kibanaHostname: string;
  roleName: string;
  role: RoleType;
}) {
  const roleFound = await getRole({
    elasticsearch,
    kibanaHostname,
    roleName,
  });
  if (roleFound) {
    console.log(`Skipping: Role "${roleName}" already exists`);
    return Promise.resolve();
  }

  await callKibana({
    elasticsearch,
    kibanaHostname,
    options: {
      method: 'PUT',
      url: `/api/security/role/${roleName}`,
      data: {
        metadata: { version: 1 },
        ...role,
      },
    },
  });

  console.log(
    `Created role "${roleName}" with privilege "${JSON.stringify(role.kibana)}"`
  );
}

async function getRole({
  elasticsearch,
  kibanaHostname,
  roleName,
}: {
  elasticsearch: Elasticsearch;
  kibanaHostname: string;
  roleName: string;
}): Promise<Role | null> {
  try {
    return await callKibana({
      elasticsearch,
      kibanaHostname,
      options: {
        method: 'GET',
        url: `/api/security/role/${roleName}`,
      },
    });
  } catch (e) {
    // return empty if role doesn't exist
    if (isAxiosError(e) && e.response?.status === 404) {
      return null;
    }

    throw e;
  }
}
