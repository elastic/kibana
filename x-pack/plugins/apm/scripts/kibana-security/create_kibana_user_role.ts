/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios, { AxiosRequestConfig, AxiosError } from 'axios';
import { union, difference, once } from 'lodash';

/* eslint-disable no-console */

interface User {
  username: string;
  roles: string[];
  full_name?: string;
  email?: string;
  enabled?: boolean;
}

export async function createKibanaUserRole({
  kibanaRoleSuffix,
  esUserName,
  esPassword,
  kibanaBaseUrl,
}: {
  esUserName: string;
  kibanaRoleSuffix?: string;
  esPassword?: string;
  kibanaBaseUrl?: string;
}) {
  if (!esPassword) {
    console.log(
      'Please specify credentials for elasticsearch: `--username elastic --password abcd` '
    );
    return;
  }

  if (!kibanaBaseUrl) {
    console.log(
      'Please specify the url for Kibana: `--kibana-url http://localhost:5601` '
    );
    return;
  }

  if (
    !kibanaBaseUrl.startsWith('https://') &&
    !kibanaBaseUrl.startsWith('http://')
  ) {
    console.log(
      'Kibana url must be prefixed with http(s):// `--kibana-url http://localhost:5601`'
    );
    return;
  }

  if (!kibanaRoleSuffix) {
    console.log(
      'Please specify a unique suffix that will be added to your roles with `--role-suffix <suffix>` '
    );
    return;
  }

  const version = await getKibanaVersion({
    esPassword,
    esUserName,
    kibanaBaseUrl,
  });
  console.log(`Connected to Kibana ${version}`);

  const isEnabled = await isSecurityEnabled({
    esUserName,
    esPassword,
    kibanaBaseUrl,
  });
  if (!isEnabled) {
    console.log('Security must be enabled!');
    return;
  }

  const APM_READ_ROLE = `apm_read_${kibanaRoleSuffix}`;
  const KIBANA_READ_ROLE = `kibana_read_${kibanaRoleSuffix}`;
  const KIBANA_WRITE_ROLE = `kibana_write_${kibanaRoleSuffix}`;
  const APM_USER_ROLE = 'apm_user';

  // create roles
  await createRole({
    roleName: APM_READ_ROLE,
    esPassword,
    esUserName,
    kibanaBaseUrl,
    kibanaPrivileges: { feature: { apm: ['read'] } },
  });
  await createRole({
    roleName: KIBANA_READ_ROLE,
    esPassword,
    esUserName,
    kibanaBaseUrl,
    kibanaPrivileges: {
      feature: {
        // core
        discover: ['read'],
        dashboard: ['read'],
        canvas: ['read'],
        ml: ['read'],
        maps: ['read'],
        graph: ['read'],
        visualize: ['read'],

        // observability
        logs: ['read'],
        infrastructure: ['read'],
        apm: ['read'],
        uptime: ['read'],

        // security
        siem: ['read'],

        // management
        dev_tools: ['read'],
        advancedSettings: ['read'],
        indexPatterns: ['read'],
        savedObjectsManagement: ['read'],
        stackAlerts: ['read'],
        fleet: ['read'],
        actions: ['read'],
      },
    },
  });
  await createRole({
    roleName: KIBANA_WRITE_ROLE,
    esPassword,
    esUserName,
    kibanaBaseUrl,
    kibanaPrivileges: {
      feature: {
        // core
        discover: ['all'],
        dashboard: ['all'],
        canvas: ['all'],
        ml: ['all'],
        maps: ['all'],
        graph: ['all'],
        visualize: ['all'],

        // observability
        logs: ['all'],
        infrastructure: ['all'],
        apm: ['all'],
        uptime: ['all'],

        // security
        siem: ['all'],

        // management
        dev_tools: ['all'],
        advancedSettings: ['all'],
        indexPatterns: ['all'],
        savedObjectsManagement: ['all'],
        stackAlerts: ['all'],
        fleet: ['all'],
        actions: ['all'],
      },
    },
  });

  // read access only to APM + apm index access
  await createOrUpdateUser({
    newUser: {
      username: 'apm_read_user',
      roles: [APM_USER_ROLE, APM_READ_ROLE],
    },
    esPassword,
    esUserName,
    kibanaBaseUrl,
  });

  // read access to all apps + apm index access
  await createOrUpdateUser({
    newUser: {
      username: 'kibana_read_user',
      roles: [APM_USER_ROLE, KIBANA_READ_ROLE],
    },
    esPassword,
    esUserName,
    kibanaBaseUrl,
  });

  // read/write access to all apps + apm index access
  await createOrUpdateUser({
    newUser: {
      username: 'kibana_write_user',
      roles: [APM_USER_ROLE, KIBANA_WRITE_ROLE],
    },
    esPassword,
    esUserName,
    kibanaBaseUrl,
  });
}

async function isSecurityEnabled({
  esPassword,
  esUserName,
  kibanaBaseUrl,
}: {
  esPassword: string;
  esUserName: string;
  kibanaBaseUrl: string;
}) {
  try {
    await callKibana({
      esPassword,
      esUserName,
      kibanaBaseUrl,
      options: {
        url: `/internal/security/me`,
      },
    });
    return true;
  } catch (err) {
    return false;
  }
}

async function callKibana<T>({
  esPassword,
  esUserName,
  kibanaBaseUrl,
  options,
}: {
  esPassword: string;
  esUserName: string;
  kibanaBaseUrl: string;
  options: AxiosRequestConfig;
}): Promise<T> {
  const kibanaBasePath = await getKibanaBasePath({ kibanaBaseUrl });

  if (!esPassword) {
    throw new Error('Missing `--password`');
  }

  const { data } = await axios.request({
    ...options,
    baseURL: kibanaBaseUrl + kibanaBasePath,
    auth: {
      username: esUserName,
      password: esPassword,
    },
    headers: { 'kbn-xsrf': 'true', ...options.headers },
  });
  return data;
}

type Privilege = [] | ['read'] | ['all'];

async function createRole({
  esPassword,
  esUserName,
  kibanaBaseUrl,
  roleName,
  kibanaPrivileges,
}: {
  roleName: string;
  kibanaPrivileges: { base?: Privilege; feature?: Record<string, Privilege> };
  esPassword: string;
  esUserName: string;
  kibanaBaseUrl: string;
}) {
  const role = await getRole({
    esPassword,
    esUserName,
    kibanaBaseUrl,
    roleName,
  });
  if (role) {
    console.log(`Skipping: Role "${roleName}" already exists`);
    return;
  }

  await callKibana({
    esPassword,
    esUserName,
    kibanaBaseUrl,
    options: {
      method: 'PUT',
      url: `/api/security/role/${roleName}`,
      data: {
        metadata: { version: 1 },
        elasticsearch: { cluster: [], indices: [] },
        kibana: [
          {
            base: kibanaPrivileges.base ?? [],
            feature: kibanaPrivileges.feature ?? {},
            spaces: ['*'],
          },
        ],
      },
    },
  });

  console.log(
    `Created role "${roleName}" with privilege "${JSON.stringify(
      kibanaPrivileges
    )}"`
  );
}

async function createOrUpdateUser({
  esPassword,
  esUserName,
  kibanaBaseUrl,
  newUser,
}: {
  esPassword: string;
  esUserName: string;
  kibanaBaseUrl: string;
  newUser: User;
}) {
  const existingUser = await getUser({
    esPassword,
    esUserName,
    kibanaBaseUrl,
    username: newUser.username,
  });
  if (!existingUser) {
    return createUser({ esPassword, esUserName, kibanaBaseUrl, newUser });
  }

  return updateUser({
    esPassword,
    esUserName,
    kibanaBaseUrl,
    existingUser,
    newUser,
  });
}

async function createUser({
  esPassword,
  esUserName,
  kibanaBaseUrl,
  newUser,
}: {
  esPassword: string;
  esUserName: string;
  kibanaBaseUrl: string;
  newUser: User;
}) {
  const user = await callKibana<User>({
    esPassword,
    esUserName,
    kibanaBaseUrl,
    options: {
      method: 'POST',
      url: `/internal/security/users/${newUser.username}`,
      data: {
        ...newUser,
        enabled: true,
        password: esPassword,
      },
    },
  });

  console.log(`User "${newUser.username}" was created`);
  return user;
}

async function updateUser({
  esPassword,
  esUserName,
  kibanaBaseUrl,
  existingUser,
  newUser,
}: {
  esPassword: string;
  esUserName: string;
  kibanaBaseUrl: string;
  existingUser: User;
  newUser: User;
}) {
  const { username } = newUser;
  const allRoles = union(existingUser.roles, newUser.roles);
  const hasAllRoles = difference(allRoles, existingUser.roles).length === 0;
  if (hasAllRoles) {
    console.log(
      `Skipping: User "${username}" already has neccesarry roles: "${newUser.roles}"`
    );
    return;
  }

  // assign role to user
  await callKibana({
    esPassword,
    esUserName,
    kibanaBaseUrl,
    options: {
      method: 'POST',
      url: `/internal/security/users/${username}`,
      data: { ...existingUser, roles: allRoles },
    },
  });

  console.log(`User "${username}" was updated`);
}

async function getUser({
  esPassword,
  esUserName,
  kibanaBaseUrl,
  username,
}: {
  esPassword: string;
  esUserName: string;
  kibanaBaseUrl: string;
  username: string;
}) {
  try {
    return await callKibana<User>({
      esPassword,
      esUserName,
      kibanaBaseUrl,
      options: {
        url: `/internal/security/users/${username}`,
      },
    });
  } catch (e) {
    // return empty if user doesn't exist
    if (isAxiosError(e) && e.response?.status === 404) {
      return null;
    }

    throw e;
  }
}

async function getRole({
  esPassword,
  esUserName,
  kibanaBaseUrl,
  roleName,
}: {
  esPassword: string;
  esUserName: string;
  kibanaBaseUrl: string;
  roleName: string;
}) {
  try {
    return await callKibana({
      esPassword,
      esUserName,
      kibanaBaseUrl,
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

async function getKibanaVersion({
  esPassword,
  esUserName,
  kibanaBaseUrl,
}: {
  esPassword: string;
  esUserName: string;
  kibanaBaseUrl: string;
}) {
  try {
    const res: { version: { number: number } } = await callKibana({
      esPassword,
      esUserName,
      kibanaBaseUrl,
      options: {
        method: 'GET',
        url: `/api/status`,
      },
    });
    return res.version.number;
  } catch (e) {
    if (isAxiosError(e)) {
      switch (e.response?.status) {
        case 401:
          throw new AbortError(
            `Could not access Kibana with the provided credentials. Username: "${e.config.auth?.username}". Password: "${e.config.auth?.password}"`
          );

        case 404:
          throw new AbortError(
            `Could not get version on ${e.config.url} (Code: 404)`
          );

        default:
          throw new AbortError(
            `Cannot access Kibana on ${e.config.baseURL}. Please specify Kibana with: "--kibana-url <url>"`
          );
      }
    }
    throw e;
  }
}

export function isAxiosError(e: AxiosError | Error): e is AxiosError {
  return 'isAxiosError' in e;
}

export class AbortError extends Error {
  constructor(message: string) {
    super(message);
  }
}

const getKibanaBasePath = once(
  async ({ kibanaBaseUrl }: { kibanaBaseUrl: string }) => {
    try {
      await axios.request({ url: kibanaBaseUrl, maxRedirects: 0 });
    } catch (e) {
      if (isAxiosError(e)) {
        const location = e.response?.headers?.location;
        const isBasePath = RegExp(/^\/\w{3}$/).test(location);
        return isBasePath ? location : '';
      }

      throw e;
    }
    return '';
  }
);
