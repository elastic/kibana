/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NavigationTreeDefinition } from '@kbn/shared-ux-chrome-navigation';
import type { AppDeepLinkId, NodeDefinition } from '@kbn/core-chrome-browser';
import type { NonEmptyArray } from '@kbn/shared-ux-chrome-navigation/src/ui/types';
import type { LinkCategory } from '@kbn/security-solution-navigation';
import {
  SecurityPageName,
  isSeparatorLinkCategory,
  isTitleLinkCategory,
} from '@kbn/security-solution-navigation';
import type { ProjectNavigationLink, ProjectPageName } from '../links/types';
import { CATEGORIES } from '../side_navigation/categories';
import { getNavLinkIdFromProjectPageName } from '../links/util';
import { isBreadcrumbHidden } from './utils';

export const formatNavigationTree = (
  projectNavLinks: ProjectNavigationLink[]
): NavigationTreeDefinition => ({
  body: [
    {
      type: 'navGroup',
      id: 'security_project_nav',
      title: 'Security',
      icon: 'logoSecurity',
      defaultIsCollapsed: false,
      children: formatNodesFromProjectNavigationLinks(
        projectNavLinks,
        CATEGORIES as Array<LinkCategory<ProjectPageName>>
      ),
    },
  ],
  footer: [
    {
      type: 'navGroup',
      id: 'getStarted',
      title: 'Get Started',
      link: getNavLinkIdFromProjectPageName(SecurityPageName.landing) as AppDeepLinkId,
      icon: 'launch',
    },
    {
      type: 'navGroup',
      id: 'devTools',
      title: 'Developer tools',
      link: 'dev_tools',
      icon: 'editorCodeBlock',
    },
    {
      type: 'navGroup',
      id: 'project_settings_project_nav',
      title: 'Project settings',
      icon: 'gear',
      breadcrumbStatus: 'hidden',
      children: [
        {
          id: 'settings',
          children: [
            {
              link: 'management',
              title: 'Management',
            },
            {
              link: 'integrations',
            },
            {
              link: 'fleet',
            },
            {
              id: 'cloudLinkUserAndRoles',
              cloudLink: 'userAndRoles',
            },
            {
              id: 'cloudLinkBilling',
              cloudLink: 'billingAndSub',
            },
          ],
        },
      ],
    },
  ],
});

const formatNodesFromProjectNavigationLinks = (
  projectNavLinks: ProjectNavigationLink[],
  parentCategories?: Readonly<Array<LinkCategory<ProjectPageName>>>
): NonEmptyArray<NodeDefinition> | undefined => {
  if (projectNavLinks.length === 0) {
    return undefined;
  }
  const nodes: NodeDefinition[] = [];
  if (parentCategories?.length) {
    parentCategories.forEach((category) => {
      nodes.push(...formatNodesFromLinksWithCategory(projectNavLinks, category));
    }, []);
  } else {
    nodes.push(...formatNodesFromLinks(projectNavLinks));
  }
  if (nodes.length === 0) {
    return undefined;
  }
  return nodes as NonEmptyArray<NodeDefinition>;
};

const formatNodesFromLinksWithCategory = (
  projectNavLinks: ProjectNavigationLink[],
  category: LinkCategory<ProjectPageName>
): NodeDefinition[] => {
  if (!category?.linkIds) {
    return [];
  }
  if (isTitleLinkCategory(category)) {
    const children = category.linkIds.reduce<NodeDefinition[]>((acc, linkId) => {
      const projectNavLink = projectNavLinks.find(({ id }) => id === linkId);
      if (projectNavLink == null) {
        return acc;
      }
      const node = createNodeFromProjectNavLink(projectNavLink);
      acc.push(node);
      return acc;
    }, []);

    if (children.length === 0) {
      return [];
    }
    return [
      {
        id: `category-${category.label.toLowerCase().replace(' ', '_')}`,
        title: category.label,
        children: children as NonEmptyArray<NodeDefinition>,
      },
    ];
  } else if (isSeparatorLinkCategory(category)) {
    // TODO: Add separator support
    const categoryProjectNavLinks = category.linkIds.reduce<ProjectNavigationLink[]>(
      (acc, linkId) => {
        const projectNavLink = projectNavLinks.find(({ id }) => id === linkId);
        if (projectNavLink == null) {
          return acc;
        }
        acc.push(projectNavLink);
        return acc;
      },
      []
    );
    return formatNodesFromLinks(categoryProjectNavLinks);
  }
  return [];
};

const formatNodesFromLinks = (projectNavLinks: ProjectNavigationLink[]) =>
  projectNavLinks.map((projectNavLink) =>
    createNodeFromProjectNavLink(projectNavLink)
  ) as NonEmptyArray<NodeDefinition>;

const createNodeFromProjectNavLink = (projectNavLink: ProjectNavigationLink): NodeDefinition => {
  const { id, title, links, categories } = projectNavLink;
  const link = getNavLinkIdFromProjectPageName(id);
  const node: NodeDefinition = {
    link: link as AppDeepLinkId,
    title,
    ...(isBreadcrumbHidden(id) && { breadcrumbStatus: 'hidden' }),
  };
  if (links?.length) {
    node.children = formatNodesFromProjectNavigationLinks(links, categories);
  }
  return node;
};
