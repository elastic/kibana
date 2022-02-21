/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('../../../shared/layout', () => ({
  generateNavLink: jest.fn(({ to, items }) => ({ href: to, items })),
}));
jest.mock('../../views/content_sources/components/source_sub_nav', () => ({
  useSourceSubNav: () => [],
}));
jest.mock('../../views/groups/components/group_sub_nav', () => ({
  useGroupSubNav: () => [],
}));
jest.mock('../../views/settings/components/settings_sub_nav', () => ({
  useSettingsSubNav: () => [],
}));

import { useWorkplaceSearchNav } from './';

describe('useWorkplaceSearchNav', () => {
  it('returns an array of top-level Workplace Search nav items', () => {
    expect(useWorkplaceSearchNav()).toEqual([
      {
        id: '',
        name: '',
        items: [
          {
            id: 'root',
            name: 'Overview',
            href: '/',
          },
          {
            id: 'sources',
            name: 'Sources',
            href: '/sources',
            items: [],
          },
          {
            id: 'groups',
            name: 'Groups',
            href: '/groups',
            items: [],
          },
          {
            id: 'usersRoles',
            name: 'Users and roles',
            href: '/users_and_roles',
          },
          {
            id: 'apiKeys',
            name: 'API keys',
            href: '/api_keys',
          },
          {
            id: 'security',
            name: 'Security',
            href: '/security',
          },
          {
            id: 'settings',
            name: 'Settings',
            href: '/settings',
            items: [],
          },
        ],
      },
    ]);
  });
});
