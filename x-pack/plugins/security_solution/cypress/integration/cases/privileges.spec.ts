/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TestCaseWithoutTimeline } from '../../objects/case';
import { ALL_CASES_NAME } from '../../screens/all_cases';

import { goToCreateNewCase } from '../../tasks/all_cases';
import { cleanKibana, deleteCases } from '../../tasks/common';

import {
  backToCases,
  createCase,
  fillCasesMandatoryfields,
  filterStatusOpen,
} from '../../tasks/create_new_case';
import {
  constructUrlWithUser,
  getEnvAuth,
  loginWithUserAndWaitForPageWithoutDateRange,
} from '../../tasks/login';

import { CASES_URL } from '../../urls/navigation';

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

const secAll: Role = {
  name: 'sec_all_role',
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
          siem: ['all'],
          securitySolutionCases: ['all'],
          actions: ['all'],
          actionsSimulators: ['all'],
        },
        spaces: ['*'],
      },
    ],
  },
};

const secAllUser: User = {
  username: 'sec_all_user',
  password: 'password',
  roles: [secAll.name],
};

const secReadCasesAll: Role = {
  name: 'sec_read_cases_all_role',
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
          siem: ['read'],
          securitySolutionCases: ['all'],
          actions: ['all'],
          actionsSimulators: ['all'],
        },
        spaces: ['*'],
      },
    ],
  },
};

const secReadCasesAllUser: User = {
  username: 'sec_read_cases_all_user',
  password: 'password',
  roles: [secReadCasesAll.name],
};

const usersToCreate = [secAllUser, secReadCasesAllUser];
const rolesToCreate = [secAll, secReadCasesAll];

const getUserInfo = (user: User): UserInfo => ({
  username: user.username,
  full_name: user.username.replace('_', ' '),
  email: `${user.username}@elastic.co`,
});

const createUsersAndRoles = (users: User[], roles: Role[]) => {
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

const deleteUsersAndRoles = (users: User[], roles: Role[]) => {
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

const testCase: TestCaseWithoutTimeline = {
  name: 'This is the title of the case',
  tags: ['Tag1', 'Tag2'],
  description: 'This is the case description',
  reporter: 'elastic',
  owner: 'securitySolution',
};

describe('Cases privileges', () => {
  before(() => {
    cleanKibana();
    createUsersAndRoles(usersToCreate, rolesToCreate);
  });

  after(() => {
    deleteUsersAndRoles(usersToCreate, rolesToCreate);
    cleanKibana();
  });

  beforeEach(() => {
    deleteCases();
  });

  for (const user of [secAllUser, secReadCasesAllUser]) {
    it(`User ${user.username} with role(s) ${user.roles.join()} can create a case`, () => {
      loginWithUserAndWaitForPageWithoutDateRange(CASES_URL, user);
      goToCreateNewCase();
      fillCasesMandatoryfields(testCase);
      createCase();
      backToCases();
      filterStatusOpen();

      cy.get(ALL_CASES_NAME).should('have.text', testCase.name);
    });
  }
});
