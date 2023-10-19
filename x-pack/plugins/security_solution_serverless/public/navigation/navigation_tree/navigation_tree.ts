/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import type { NavigationTreeDefinition } from '@kbn/shared-ux-chrome-navigation';
import type { AppDeepLinkId, NodeDefinition } from '@kbn/core-chrome-browser';
import type { LinkCategory } from '@kbn/security-solution-navigation';
import {
  SecurityPageName,
  isSeparatorLinkCategory,
  isTitleLinkCategory,
} from '@kbn/security-solution-navigation';
import type { ProjectNavigationLink, ProjectPageName } from '../links/types';
import { getNavLinkIdFromProjectPageName } from '../links/util';
import { isBreadcrumbHidden } from './utils';

const SECURITY_TITLE = i18n.translate('xpack.securitySolutionServerless.nav.solution.title', {
  defaultMessage: 'Security',
});
const GET_STARTED_TITLE = i18n.translate('xpack.securitySolutionServerless.nav.getStarted.title', {
  defaultMessage: 'Get Started',
});
const DEV_TOOLS_TITLE = i18n.translate('xpack.securitySolutionServerless.nav.devTools.title', {
  defaultMessage: 'Developer tools',
});
const PROJECT_SETTINGS_TITLE = i18n.translate(
  'xpack.securitySolutionServerless.nav.projectSettings.title',
  {
    defaultMessage: 'Project settings',
  }
);

export const formatNavigationTree = (
  projectNavLinks: ProjectNavigationLink[],
  categories?: Readonly<Array<LinkCategory<ProjectPageName>>>
): NavigationTreeDefinition => {
  const children = formatNodesFromLinks(projectNavLinks, categories);
  return {
    body: [
      children
        ? {
            type: 'navGroup',
            id: 'security_project_nav',
            title: SECURITY_TITLE,
            icon: 'logoSecurity',
            breadcrumbStatus: 'hidden',
            defaultIsCollapsed: false,
            children,
          }
        : {
            type: 'navItem',
            id: 'security_project_nav',
            title: SECURITY_TITLE,
            icon: 'logoSecurity',
            breadcrumbStatus: 'hidden',
          },
    ],
    footer: [
      {
        type: 'navItem',
        id: 'getStarted',
        title: GET_STARTED_TITLE,
        link: getNavLinkIdFromProjectPageName(SecurityPageName.landing) as AppDeepLinkId,
        icon: 'launch',
      },
      {
        type: 'navItem',
        id: 'devTools',
        title: DEV_TOOLS_TITLE,
        link: 'dev_tools',
        icon: 'editorCodeBlock',
      },
      {
        type: 'navGroup',
        id: 'project_settings_project_nav',
        title: PROJECT_SETTINGS_TITLE,
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
  };
};

const formatNodesFromLinks = (
  projectNavLinks: ProjectNavigationLink[],
  parentCategories?: Readonly<Array<LinkCategory<ProjectPageName>>>
): NodeDefinition[] | undefined => {
  if (projectNavLinks.length === 0) {
    return undefined;
  }
  const nodes: NodeDefinition[] = [];
  if (parentCategories?.length) {
    parentCategories.forEach((category) => {
      nodes.push(...formatNodesFromLinksWithCategory(projectNavLinks, category));
    }, []);
  } else {
    nodes.push(...formatNodesFromLinksWithoutCategory(projectNavLinks));
  }
  if (nodes.length === 0) {
    return undefined;
  }
  return nodes as NodeDefinition[];
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
      if (projectNavLink != null) {
        acc.push(createNodeFromProjectNavLink(projectNavLink));
      }
      return acc;
    }, []);
    if (children.length === 0) {
      return [];
    }
    return [
      {
        id: `category-${category.label.toLowerCase().replace(' ', '_')}`,
        title: category.label,
        children: children as NodeDefinition[],
      },
    ];
  } else if (isSeparatorLinkCategory(category)) {
    // TODO: Add separator support when implemented in the shared-ux navigation
    const categoryProjectNavLinks = category.linkIds.reduce<ProjectNavigationLink[]>(
      (acc, linkId) => {
        const projectNavLink = projectNavLinks.find(({ id }) => id === linkId);
        if (projectNavLink != null) {
          acc.push(projectNavLink);
        }
        return acc;
      },
      []
    );
    return formatNodesFromLinksWithoutCategory(categoryProjectNavLinks);
  }
  return [];
};

const formatNodesFromLinksWithoutCategory = (projectNavLinks: ProjectNavigationLink[]) =>
  projectNavLinks.map((projectNavLink) =>
    createNodeFromProjectNavLink(projectNavLink)
  ) as NodeDefinition[];

const createNodeFromProjectNavLink = (projectNavLink: ProjectNavigationLink): NodeDefinition => {
  const { id, title, links, categories } = projectNavLink;
  const link = getNavLinkIdFromProjectPageName(id);
  const node: NodeDefinition = {
    link: link as AppDeepLinkId,
    title,
    ...(isBreadcrumbHidden(id) && { breadcrumbStatus: 'hidden' }),
  };
  if (links?.length) {
    node.children = formatNodesFromLinks(links, categories);
  }
  return node;
};
