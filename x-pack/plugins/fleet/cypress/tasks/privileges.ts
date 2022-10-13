/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { constructUrlWithUser, getEnvAuth } from './login';

interface User {
  username: string;
  password: string;
  description?: string;
  roles: string[];
}

interface UserInfo {
  username: string;
  full_name: string;
  email: string;
}

interface FeaturesPrivileges {
  [featureId: string]: string[];
}

interface ElasticsearchIndices {
  names: string[];
  privileges: string[];
}

interface ElasticSearchPrivilege {
  cluster?: string[];
  indices?: ElasticsearchIndices[];
}

interface KibanaPrivilege {
  spaces: string[];
  base?: string[];
  feature?: FeaturesPrivileges;
}

interface Role {
  name: string;
  privileges: {
    elasticsearch?: ElasticSearchPrivilege;
    kibana?: KibanaPrivilege[];
  };
}

// Create roles with allowed combinations of Fleet and Integrations
export const FleetAllIntegrAllRole: Role = {
  name: 'fleet_all_int_all_role',
  privileges: {
    elasticsearch: {
      indices: [
        {
          names: ['*'],
          privileges: ['all'],
        },
      ],
    },
    kibana: [
      {
        feature: {
          fleetv2: ['all'],
          fleet: ['all'],
        },
        spaces: ['*'],
      },
    ],
  },
};

export const FleetAllIntegrAllUser: User = {
  username: 'fleet_all_int_all_user',
  password: 'password',
  roles: [FleetAllIntegrAllRole.name],
};

export const FleetAllIntegrReadRole: Role = {
  name: 'fleet_all_int_read_user',
  privileges: {
    elasticsearch: {
      indices: [
        {
          names: ['*'],
          privileges: ['all'],
        },
      ],
    },
    kibana: [
      {
        feature: {
          fleetv2: ['all'],
          fleet: ['read'],
        },
        spaces: ['*'],
      },
    ],
  },
};
export const FleetAllIntegrReadUser: User = {
  username: 'fleet_all_int_read_user',
  password: 'password',
  roles: [FleetAllIntegrReadRole.name],
};
export const FleetAllIntegrNoneRole: Role = {
  name: 'fleet_all_int_none_role',
  privileges: {
    elasticsearch: {
      indices: [
        {
          names: ['*'],
          privileges: ['all'],
        },
      ],
    },
    kibana: [
      {
        feature: {
          fleetv2: ['all'],
          fleet: ['none'],
        },
        spaces: ['*'],
      },
    ],
  },
};
export const FleetAllIntegrNoneUser: User = {
  username: 'fleet_all_int_none_user',
  password: 'password',
  roles: [FleetAllIntegrNoneRole.name],
};
export const FleetNoneIntegrAllRole: Role = {
  name: 'fleet_none_int_all_role',
  privileges: {
    elasticsearch: {
      indices: [
        {
          names: ['*'],
          privileges: ['all'],
        },
      ],
    },
    kibana: [
      {
        feature: {
          fleetv2: ['none'],
          fleet: ['all'],
        },
        spaces: ['*'],
      },
    ],
  },
};
export const FleetNoneIntegrAllUser: User = {
  username: 'fleet_none_int_all_user',
  password: 'password',
  roles: [FleetNoneIntegrAllRole.name],
};

const getUserInfo = (user: User): UserInfo => ({
  username: user.username,
  full_name: user.username.replace('_', ' '),
  email: `${user.username}@elastic.co`,
});

export enum ROLES {
  elastic = 'elastic',
}

export const createUsersAndRoles = (users: User[], roles: Role[]) => {
  const envUser = getEnvAuth();
  for (const role of roles) {
    cy.log(`Creating role: ${JSON.stringify(role)}`);
    cy.request({
      body: role.privileges,
      headers: { 'kbn-xsrf': 'cypress-creds-via-config' },
      method: 'PUT',
      url: constructUrlWithUser(envUser, `/api/security/role/${role.name}`),
    })
      .its('status')
      .should('eql', 204);
  }

  for (const user of users) {
    const userInfo = getUserInfo(user);
    cy.log(`Creating user: ${JSON.stringify(user)}`);
    cy.request({
      body: {
        username: user.username,
        password: user.password,
        roles: user.roles,
        full_name: userInfo.full_name,
        email: userInfo.email,
      },
      headers: { 'kbn-xsrf': 'cypress-creds-via-config' },
      method: 'POST',
      url: constructUrlWithUser(envUser, `/internal/security/users/${user.username}`),
    })
      .its('status')
      .should('eql', 200);
  }
};

export const deleteUsersAndRoles = (users: User[], roles: Role[]) => {
  const envUser = getEnvAuth();
  for (const user of users) {
    cy.log(`Deleting user: ${JSON.stringify(user)}`);
    cy.request({
      headers: { 'kbn-xsrf': 'cypress-creds-via-config' },
      method: 'DELETE',
      url: constructUrlWithUser(envUser, `/internal/security/users/${user.username}`),
      failOnStatusCode: false,
    })
      .its('status')
      .should('oneOf', [204, 404]);
  }

  for (const role of roles) {
    cy.log(`Deleting role: ${JSON.stringify(role)}`);
    cy.request({
      headers: { 'kbn-xsrf': 'cypress-creds-via-config' },
      method: 'DELETE',
      url: constructUrlWithUser(envUser, `/api/security/role/${role.name}`),
      failOnStatusCode: false,
    })
      .its('status')
      .should('oneOf', [204, 404]);
  }
};
