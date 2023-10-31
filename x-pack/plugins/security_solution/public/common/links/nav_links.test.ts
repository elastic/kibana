/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppLinkItems } from './types';
import { formatNavigationLinks } from './nav_links';
import { SecurityPageName } from '../../app/types';

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

describe('formatNavigationLinks', () => {
  it('should format links', () => {
    expect(formatNavigationLinks(mockNavLinks)).toMatchInlineSnapshot(`
      Array [
        Object {
          "description": "description",
          "id": "administration",
          "links": Array [
            Object {
              "description": "description 2",
              "disabled": true,
              "id": "endpoints",
              "landingIcon": "someicon",
              "landingImage": "someimage",
              "skipUrlState": true,
              "title": "title 2",
            },
          ],
          "title": "title",
        },
      ]
    `);
  });
});
