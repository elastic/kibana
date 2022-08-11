/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { SecurityPageName } from '../../../app/types';
import type { AppLinkItems } from '../../links';
import { TestProviders } from '../../mock';
import { useAppNavLinks, useAppRootNavLink } from './nav_links';
import type { NavLinkItem } from './types';

const mockNavLinks: AppLinkItems = [
  {
    description: 'description',
    id: SecurityPageName.administration,
    links: [
      {
        description: 'description 2',
        id: SecurityPageName.endpoints,
        links: [],
        path: '/path_2',
        title: 'title 2',
        sideNavDisabled: true,
        landingIcon: 'someicon',
        landingImage: 'someimage',
        skipUrlState: true,
      },
    ],
    path: '/path',
    title: 'title',
  },
];

jest.mock('../../links', () => ({
  useAppLinks: () => mockNavLinks,
}));

const renderUseAppNavLinks = () =>
  renderHook<{}, NavLinkItem[]>(() => useAppNavLinks(), { wrapper: TestProviders });

const renderUseAppRootNavLink = (id: SecurityPageName) =>
  renderHook<{ id: SecurityPageName }, NavLinkItem | undefined>(() => useAppRootNavLink(id), {
    wrapper: TestProviders,
  });

describe('useAppNavLinks', () => {
  it('should return all nav links', () => {
    const { result } = renderUseAppNavLinks();
    expect(result.current).toMatchInlineSnapshot(`
      Array [
        Object {
          "description": "description",
          "id": "administration",
          "links": Array [
            Object {
              "description": "description 2",
              "disabled": true,
              "icon": "someicon",
              "id": "endpoints",
              "image": "someimage",
              "skipUrlState": true,
              "title": "title 2",
            },
          ],
          "title": "title",
        },
      ]
    `);
  });

  it('should return a root nav links', () => {
    const { result } = renderUseAppRootNavLink(SecurityPageName.administration);
    expect(result.current).toMatchInlineSnapshot(`
      Object {
        "description": "description",
        "id": "administration",
        "links": Array [
          Object {
            "description": "description 2",
            "disabled": true,
            "icon": "someicon",
            "id": "endpoints",
            "image": "someimage",
            "skipUrlState": true,
            "title": "title 2",
          },
        ],
        "title": "title",
      }
    `);
  });
});
