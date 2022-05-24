/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/* eslint-disable no-console */

import { Role } from '@kbn/security-plugin/common/model';
import { callKibana, isAxiosError } from './call_kibana';
import { Elasticsearch, Kibana } from '../create_apm_users_and_roles';

type Privilege = [] | ['read'] | ['all'];
export interface KibanaPrivileges {
  base?: Privilege;
  feature?: Record<string, Privilege>;
}

export type RoleType = Omit<Role, 'name' | 'metadata'>;

export async function createRole({
  elasticsearch,
  kibana,
  roleName,
  role,
}: {
  elasticsearch: Elasticsearch;
  kibana: Kibana;
  roleName: string;
  role: RoleType;
}) {
  const roleFound = await getRole({
    elasticsearch,
    kibana,
    roleName,
  });
  if (roleFound) {
    console.log(`Skipping: Role "${roleName}" already exists`);
    return Promise.resolve();
  }

  await callKibana({
    elasticsearch,
    kibana,
    options: {
      method: 'PUT',
      url: `/api/security/role/${roleName}`,
      data: {
        metadata: { version: 1 },
        ...role,
      },
    },
  });

  console.log(`Created role "${roleName}"`);
}

async function getRole({
  elasticsearch,
  kibana,
  roleName,
}: {
  elasticsearch: Elasticsearch;
  kibana: Kibana;
  roleName: string;
}): Promise<Role | null> {
  try {
    return await callKibana({
      elasticsearch,
      kibana,
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
