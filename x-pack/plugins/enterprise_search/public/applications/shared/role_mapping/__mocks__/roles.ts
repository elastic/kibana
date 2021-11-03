/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { engines } from '../../../app_search/__mocks__/engines.mock';

import { AttributeName } from '../../types';

import { elasticsearchUsers } from './elasticsearch_users';

export const asRoleMapping = {
  id: 'sdgfasdgadf123',
  attributeName: 'role' as AttributeName,
  attributeValue: 'superuser',
  authProvider: ['*'],
  roleType: 'owner',
  rules: {
    role: 'superuser',
  },
  accessAllEngines: true,
  engines,
  toolTip: {
    content: 'Elasticsearch superusers will always be able to log in as the owner',
  },
};

export const wsRoleMapping = {
  id: '602d4ba85foobarbaz123',
  attributeName: 'username' as AttributeName,
  attributeValue: 'user',
  authProvider: ['*', 'other_auth'],
  roleType: 'admin',
  rules: {
    username: 'user',
  },
  allGroups: true,
  groups: [
    {
      id: '602c3b475foobarbaz123',
      name: 'Default',
      createdAt: '2021-02-16T21:38:15Z',
      updatedAt: '2021-02-16T21:40:32Z',
      contentSources: [
        {
          id: '602c3bcf5foobarbaz123',
          name: 'National Parks',
          serviceType: 'custom',
        },
      ],
      users: [
        {
          id: '602c3b485foobarbaz123',
          name: 'you_know_for_search',
          email: 'foo@example.com',
          initials: 'E',
          pictureUrl: null,
          color: '#ffcc13',
        },
        {
          id: '602c3bf85foobarbaz123',
          name: 'elastic',
          email: null,
          initials: 'E',
          pictureUrl: null,
          color: '#7968ff',
        },
      ],
      usersCount: 2,
    },
  ],
};

export const invitation = {
  email: 'foo@example.com',
  code: '123fooqwe',
};

export const wsSingleUserRoleMapping = {
  invitation,
  elasticsearchUser: elasticsearchUsers[0],
  roleMapping: wsRoleMapping,
};

export const asSingleUserRoleMapping = {
  invitation,
  elasticsearchUser: elasticsearchUsers[0],
  roleMapping: asRoleMapping,
};
