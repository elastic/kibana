/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues } from '../../../__mocks__/kea_logic';

jest.mock('../../../shared/layout', () => ({
  generateNavLink: jest.fn(({ to }) => ({ href: to })),
}));

import { useAppSearchNav } from './nav';

describe('useAppSearchNav', () => {
  it('always generates a default engines nav item', () => {
    setMockValues({ myRole: {} });

    expect(useAppSearchNav()).toEqual([
      {
        id: '',
        name: '',
        items: [
          {
            id: 'engines',
            name: 'Engines',
            href: '/engines',
            items: [],
          },
        ],
      },
    ]);
  });

  it('generates a settings nav item if the user can view settings', () => {
    setMockValues({ myRole: { canViewSettings: true } });

    expect(useAppSearchNav()).toEqual([
      {
        id: '',
        name: '',
        items: [
          {
            id: 'engines',
            name: 'Engines',
            href: '/engines',
            items: [],
          },
          {
            id: 'settings',
            name: 'Settings',
            href: '/settings',
          },
        ],
      },
    ]);
  });

  it('generates a credentials nav item if the user can view credentials', () => {
    setMockValues({ myRole: { canViewAccountCredentials: true } });

    expect(useAppSearchNav()).toEqual([
      {
        id: '',
        name: '',
        items: [
          {
            id: 'engines',
            name: 'Engines',
            href: '/engines',
            items: [],
          },
          {
            id: 'credentials',
            name: 'Credentials',
            href: '/credentials',
          },
        ],
      },
    ]);
  });

  it('generates a users & roles nav item if the user can view role mappings', () => {
    setMockValues({ myRole: { canViewRoleMappings: true } });

    expect(useAppSearchNav()).toEqual([
      {
        id: '',
        name: '',
        items: [
          {
            id: 'engines',
            name: 'Engines',
            href: '/engines',
            items: [],
          },
          {
            id: 'usersRoles',
            name: 'Users & roles',
            href: '/role_mappings',
          },
        ],
      },
    ]);
  });
});
