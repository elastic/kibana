/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable no-console */

import axios, { AxiosRequestConfig, AxiosError } from 'axios';
import { union, difference, once } from 'lodash';
import { argv } from 'yargs';

const KIBANA_ROLE_SUFFIX = argv.roleSuffix as string | undefined;
const ELASTICSEARCH_USERNAME = (argv.username as string) || 'elastic';
const ELASTICSEARCH_PASSWORD = argv.password as string | undefined;
const KIBANA_BASE_URL = argv.kibanaUrl as string | undefined;

console.log({
  KIBANA_ROLE_SUFFIX,
  ELASTICSEARCH_USERNAME,
  ELASTICSEARCH_PASSWORD,
  KIBANA_BASE_URL,
});

interface User {
  username: string;
  roles: string[];
  full_name?: string;
  email?: string;
  enabled?: boolean;
}

const getKibanaBasePath = once(async () => {
  try {
    await axios.request({ url: KIBANA_BASE_URL, maxRedirects: 0 });
  } catch (e) {
    if (isAxiosError(e)) {
      const location = e.response?.headers?.location;
      const isBasePath = RegExp(/^\/\w{3}$/).test(location);
      return isBasePath ? location : '';
    }

    throw e;
  }
  return '';
});

init().catch((e) => {
  if (e instanceof AbortError) {
    console.error(e.message);
  } else if (isAxiosError(e)) {
    console.error(
      `${e.config.method?.toUpperCase() || 'GET'} ${e.config.url} (Code: ${
        e.response?.status
      })`
    );

    if (e.response) {
      console.error(
        JSON.stringify(
          { request: e.config, response: e.response.data },
          null,
          2
        )
      );
    }
  } else {
    console.error(e);
  }
});

async function init() {
  if (!ELASTICSEARCH_PASSWORD) {
    console.log(
      'Please specify credentials for elasticsearch: `--username elastic --password abcd` '
    );
    return;
  }

  if (!KIBANA_BASE_URL) {
    console.log(
      'Please specify the url for Kibana: `--kibana-url http://localhost:5601` '
    );
    return;
  }

  if (
    !KIBANA_BASE_URL.startsWith('https://') &&
    !KIBANA_BASE_URL.startsWith('http://')
  ) {
    console.log(
      'Kibana url must be prefixed with http(s):// `--kibana-url http://localhost:5601`'
    );
    return;
  }

  if (!KIBANA_ROLE_SUFFIX) {
    console.log(
      'Please specify a unique suffix that will be added to your roles with `--role-suffix <suffix>` '
    );
    return;
  }

  const version = await getKibanaVersion();
  console.log(`Connected to Kibana ${version}`);

  const isEnabled = await isSecurityEnabled();
  if (!isEnabled) {
    console.log('Security must be enabled!');
    return;
  }

  const APM_READ_ROLE = `apm_read_${KIBANA_ROLE_SUFFIX}`;
  const KIBANA_READ_ROLE = `kibana_read_${KIBANA_ROLE_SUFFIX}`;
  const KIBANA_WRITE_ROLE = `kibana_write_${KIBANA_ROLE_SUFFIX}`;
  const APM_USER_ROLE = 'apm_user';

  // create roles
  await createRole({
    roleName: APM_READ_ROLE,
    kibanaPrivileges: { feature: { apm: ['read'] } },
  });
  await createRole({
    roleName: KIBANA_READ_ROLE,
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
    username: 'apm_read_user',
    roles: [APM_USER_ROLE, APM_READ_ROLE],
  });

  // read access to all apps + apm index access
  await createOrUpdateUser({
    username: 'kibana_read_user',
    roles: [APM_USER_ROLE, KIBANA_READ_ROLE],
  });

  // read/write access to all apps + apm index access
  await createOrUpdateUser({
    username: 'kibana_write_user',
    roles: [APM_USER_ROLE, KIBANA_WRITE_ROLE],
  });
}

async function isSecurityEnabled() {
  try {
    await callKibana({
      url: `/internal/security/me`,
    });
    return true;
  } catch (err) {
    return false;
  }
}

async function callKibana<T>(options: AxiosRequestConfig): Promise<T> {
  const kibanaBasePath = await getKibanaBasePath();

  if (!ELASTICSEARCH_PASSWORD) {
    throw new Error('Missing `--password`');
  }

  const { data } = await axios.request({
    ...options,
    baseURL: KIBANA_BASE_URL + kibanaBasePath,
    auth: {
      username: ELASTICSEARCH_USERNAME,
      password: ELASTICSEARCH_PASSWORD,
    },
    headers: { 'kbn-xsrf': 'true', ...options.headers },
  });
  return data;
}

type Privilege = [] | ['read'] | ['all'];

async function createRole({
  roleName,
  kibanaPrivileges,
}: {
  roleName: string;
  kibanaPrivileges: { base?: Privilege; feature?: Record<string, Privilege> };
}) {
  const role = await getRole(roleName);
  if (role) {
    console.log(`Skipping: Role "${roleName}" already exists`);
    return;
  }

  await callKibana({
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
  });

  console.log(
    `Created role "${roleName}" with privilege "${JSON.stringify(
      kibanaPrivileges
    )}"`
  );
}

async function createOrUpdateUser(newUser: User) {
  const existingUser = await getUser(newUser.username);
  if (!existingUser) {
    return createUser(newUser);
  }

  return updateUser(existingUser, newUser);
}

async function createUser(newUser: User) {
  const user = await callKibana<User>({
    method: 'POST',
    url: `/internal/security/users/${newUser.username}`,
    data: {
      ...newUser,
      enabled: true,
      password: ELASTICSEARCH_PASSWORD,
    },
  });

  console.log(`User "${newUser.username}" was created`);
  return user;
}

async function updateUser(existingUser: User, newUser: User) {
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
    method: 'POST',
    url: `/internal/security/users/${username}`,
    data: { ...existingUser, roles: allRoles },
  });

  console.log(`User "${username}" was updated`);
}

async function getUser(username: string) {
  try {
    return await callKibana<User>({
      url: `/internal/security/users/${username}`,
    });
  } catch (e) {
    // return empty if user doesn't exist
    if (isAxiosError(e) && e.response?.status === 404) {
      return null;
    }

    throw e;
  }
}

async function getRole(roleName: string) {
  try {
    return await callKibana({
      method: 'GET',
      url: `/api/security/role/${roleName}`,
    });
  } catch (e) {
    // return empty if role doesn't exist
    if (isAxiosError(e) && e.response?.status === 404) {
      return null;
    }

    throw e;
  }
}

async function getKibanaVersion() {
  try {
    const res: { version: { number: number } } = await callKibana({
      method: 'GET',
      url: `/api/status`,
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

function isAxiosError(e: AxiosError | Error): e is AxiosError {
  return 'isAxiosError' in e;
}

class AbortError extends Error {
  constructor(message: string) {
    super(message);
  }
}
