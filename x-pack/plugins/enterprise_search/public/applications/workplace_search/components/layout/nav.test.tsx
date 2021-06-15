/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('../../../shared/layout', () => ({
  ...jest.requireActual('../../../shared/layout'),
  generateNavLink: jest.fn(({ to }) => ({ href: to })),
}));

import React from 'react';

import { shallow } from 'enzyme';

import { SideNav, SideNavLink } from '../../../shared/layout';

import { useWorkplaceSearchNav, WorkplaceSearchNav } from './';

describe('useWorkplaceSearchNav', () => {
  it('returns an array of top-level Workplace Search nav items', () => {
    expect(useWorkplaceSearchNav()).toEqual([
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
        name: 'Users & roles',
        href: '/role_mappings',
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
    ]);
  });
});

// TODO: Delete below once fully migrated to KibanaPageTemplate

describe('WorkplaceSearchNav', () => {
  it('renders', () => {
    const wrapper = shallow(<WorkplaceSearchNav />);

    expect(wrapper.find(SideNav)).toHaveLength(1);
    expect(wrapper.find(SideNavLink).first().prop('to')).toEqual('/');
    expect(wrapper.find(SideNavLink)).toHaveLength(6);
  });
});
