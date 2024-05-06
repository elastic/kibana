/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ChromeNavLink } from '@kbn/core/public';
import { APP_UI_ID } from '@kbn/security-solution-plugin/common';
import { SecurityPageName, LinkCategoryType } from '@kbn/security-solution-navigation';
import type { GroupDefinition } from '@kbn/core-chrome-browser';
import { formatNavigationTree } from './navigation_tree';
import type { ProjectNavigationLink } from '../links/types';
import type { ExternalPageName } from '../links/constants';

const link1Id = 'link-1' as SecurityPageName;
const link2Id = 'link-2' as SecurityPageName;
const link3Id = 'externalAppId:link-1' as ExternalPageName;

const link1: ProjectNavigationLink = { id: link1Id, title: 'link 1' };
const link2: ProjectNavigationLink = { id: link2Id, title: 'link 2' };
const link3: ProjectNavigationLink = { id: link3Id, title: 'link 3' };

const chromeNavLink1: ChromeNavLink = {
  id: `${APP_UI_ID}:${link1.id}`,
  title: link1.title,
  href: '/link1',
  url: '/link1',
  baseUrl: '',
  visibleIn: [],
};
const chromeNavLink2: ChromeNavLink = {
  id: `${APP_UI_ID}:${link2.id}`,
  title: link2.title,
  href: '/link2',
  url: '/link2',
  baseUrl: '',
  visibleIn: [],
};
const chromeNavLink3: ChromeNavLink = {
  id: link3.id,
  title: link3.title,
  href: '/link3',
  url: '/link3',
  baseUrl: '',
  visibleIn: [],
};

describe('formatNavigationTree', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should format flat nav nodes', async () => {
    const navigationTree = formatNavigationTree([link1], [], []);
    const securityNode = navigationTree.body?.[0] as GroupDefinition;

    expect(securityNode?.children).toEqual([
      {
        id: link1.id,
        link: chromeNavLink1.id,
        title: link1.title,
      },
    ]);
  });

  it('should format nested nav nodes with categories', async () => {
    const category = {
      label: 'Category 1',
      type: LinkCategoryType.title,
      linkIds: [link1Id],
    };
    const navigationTree = formatNavigationTree([link1], [category], []);
    const securityNode = navigationTree.body?.[0] as GroupDefinition;

    expect(securityNode?.children).toEqual([
      {
        title: category.label,
        id: expect.any(String),
        breadcrumbStatus: 'hidden',
        children: [
          {
            id: link1.id,
            link: chromeNavLink1.id,
            title: link1.title,
          },
        ],
      },
    ]);
  });

  it('should format flat nav nodes with separator categories', async () => {
    const category = {
      label: 'Category 1',
      type: LinkCategoryType.separator,
      linkIds: [link1Id, link2Id],
    };
    const navigationTree = formatNavigationTree([link1, link2], [category], []);
    const securityNode = navigationTree.body?.[0] as GroupDefinition;

    expect(securityNode?.children).toEqual([
      {
        breadcrumbStatus: 'hidden',
        children: [
          {
            id: link1.id,
            link: chromeNavLink1.id,
            title: link1.title,
          },
          {
            id: link2.id,
            link: chromeNavLink2.id,
            title: link2.title,
          },
        ],
      },
    ]);
  });

  it('should not format missing nav nodes in the category', async () => {
    const category = {
      label: 'Category 1',
      type: LinkCategoryType.title,
      linkIds: [link1Id, link2Id],
    };
    const navigationTree = formatNavigationTree([link1], [category], []);
    const securityNode = navigationTree.body?.[0] as GroupDefinition;

    expect(securityNode?.children).toEqual([
      {
        title: category.label,
        id: expect.any(String),
        breadcrumbStatus: 'hidden',
        children: [
          {
            id: link1.id,
            link: chromeNavLink1.id,
            title: link1.title,
          },
        ],
      },
    ]);
  });

  it('should format only nav nodes in the category', async () => {
    const category = {
      label: 'Category 1',
      type: LinkCategoryType.title,
      linkIds: [link1Id],
    };
    const navigationTree = formatNavigationTree([link1, link2], [category], []);
    const securityNode = navigationTree.body?.[0] as GroupDefinition;

    expect(securityNode?.children).toEqual([
      {
        title: category.label,
        id: expect.any(String),
        breadcrumbStatus: 'hidden',
        children: [
          {
            id: link1.id,
            link: chromeNavLink1.id,
            title: link1.title,
          },
        ],
      },
    ]);
  });

  it('should format external chrome nav nodes', async () => {
    const navigationTree = formatNavigationTree([link3], [], []);
    const securityNode = navigationTree.body?.[0] as GroupDefinition;

    expect(securityNode?.children).toEqual([
      {
        id: link3.id,
        link: chromeNavLink3.id,
        title: link3.title,
      },
    ]);
  });

  it('should set nested links', async () => {
    const navigationTree = formatNavigationTree(
      [{ ...link1, links: [{ ...link2, links: [link3] }] }],
      [],
      []
    );
    const securityNode = navigationTree.body?.[0] as GroupDefinition;

    expect(securityNode?.children).toEqual([
      {
        id: link1.id,
        link: chromeNavLink1.id,
        title: link1.title,
        children: [
          {
            id: link2.id,
            link: chromeNavLink2.id,
            title: link2.title,
            children: [{ id: link3.id, link: chromeNavLink3.id, title: link3.title }],
            renderAs: 'panelOpener',
          },
        ],
      },
    ]);
  });

  it('should set hidden breadcrumb for blacklisted links', async () => {
    const chromeNavLinkTest = {
      ...chromeNavLink1,
      id: `${APP_UI_ID}:${SecurityPageName.usersEvents}`, // userEvents link is blacklisted
    };

    const navigationTree = formatNavigationTree(
      [{ ...link1, id: SecurityPageName.usersEvents }, link2],
      [],
      []
    );
    const securityNode = navigationTree.body?.[0] as GroupDefinition;

    expect(securityNode?.children).toEqual([
      {
        id: SecurityPageName.usersEvents,
        link: chromeNavLinkTest.id,
        title: link1.title,
        breadcrumbStatus: 'hidden',
      },
      {
        id: link2.id,
        link: chromeNavLink2.id,
        title: link2.title,
      },
    ]);
  });
});
