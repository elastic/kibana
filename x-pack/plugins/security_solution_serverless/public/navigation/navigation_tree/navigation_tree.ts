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
import { SecurityPageName, isTitleLinkCategory } from '@kbn/security-solution-navigation';
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
  defaultMessage: 'Dev tools',
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
): NavigationTreeDefinition => ({
  body: [
    {
      type: 'navGroup',
      id: 'security_project_nav',
      title: SECURITY_TITLE,
      icon: 'logoSecurity',
      breadcrumbStatus: 'hidden',
      defaultIsCollapsed: false,
      children: addMainLinksPanelOpenerProp(formatNodesFromLinks(projectNavLinks, categories)),
    },
  ],
  footer: [
    {
      type: 'navGroup',
      id: 'getStarted',
      title: GET_STARTED_TITLE,
      link: getNavLinkIdFromProjectPageName(SecurityPageName.landing) as AppDeepLinkId,
      icon: 'launch',
      children: [],
    },
    {
      type: 'navGroup',
      id: 'devTools',
      title: DEV_TOOLS_TITLE,
      link: 'dev_tools',
      icon: 'editorCodeBlock',
      children: [],
    },
    {
      type: 'navGroup',
      id: 'project_settings_project_nav',
      title: PROJECT_SETTINGS_TITLE,
      icon: 'gear',
      breadcrumbStatus: 'hidden',
      defaultIsCollapsed: true,
      children: [
        {
          link: 'management',
          title: 'Management',
        },
        {
          link: 'integrations',
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
});

const formatNodesFromLinks = (
  projectNavLinks: ProjectNavigationLink[],
  parentCategories?: Readonly<Array<LinkCategory<ProjectPageName>>>
): NodeDefinition[] => {
  const nodes: NodeDefinition[] = [];
  if (parentCategories?.length) {
    parentCategories.forEach((category) => {
      nodes.push(...formatNodesFromLinksWithCategory(projectNavLinks, category));
    }, []);
  } else {
    nodes.push(...formatNodesFromLinksWithoutCategory(projectNavLinks));
  }
  return nodes;
};

const formatNodesFromLinksWithCategory = (
  projectNavLinks: ProjectNavigationLink[],
  category: LinkCategory<ProjectPageName>
): NodeDefinition[] => {
  if (!category?.linkIds) {
    return [];
  }

  if (category.linkIds) {
    const children = category.linkIds.reduce<NodeDefinition[]>((acc, linkId) => {
      const projectNavLink = projectNavLinks.find(({ id }) => id === linkId);
      if (projectNavLink != null) {
        acc.push(createNodeFromProjectNavLink(projectNavLink));
      }
      return acc;
    }, []);
    if (!children.length) {
      return [];
    }

    const id = isTitleLinkCategory(category)
      ? `category-${category.label.toLowerCase().replace(' ', '_')}`
      : undefined;

    return [
      {
        id,
        ...(isTitleLinkCategory(category) && { title: category.label }),
        children,
      },
    ];
  }
  return [];
};

const formatNodesFromLinksWithoutCategory = (
  projectNavLinks: ProjectNavigationLink[]
): NodeDefinition[] =>
  projectNavLinks.map((projectNavLink) => createNodeFromProjectNavLink(projectNavLink));

const createNodeFromProjectNavLink = (projectNavLink: ProjectNavigationLink): NodeDefinition => {
  const { id, title, links, categories, disabled } = projectNavLink;
  const link = getNavLinkIdFromProjectPageName(id);
  const node: NodeDefinition = {
    id,
    link: link as AppDeepLinkId,
    title,
    ...(isBreadcrumbHidden(id) && { breadcrumbStatus: 'hidden' }),
    ...(disabled && { sideNavStatus: 'hidden' }),
  };
  if (links?.length) {
    node.children = formatNodesFromLinks(links, categories);
  }
  return node;
};

/**
 * Adds the `renderAs: 'panelOpener'` prop to the main links that have children
 * This function expects all main links to be in nested groups to add the separation between them.
 * If these "separator" groups change this function will need to be updated.
 */
const addMainLinksPanelOpenerProp = (nodes: NodeDefinition[]): NodeDefinition[] =>
  nodes.map((node): NodeDefinition => {
    if (node.children?.length) {
      return {
        ...node,
        children: node.children.map((child) => ({
          ...child,
          ...(child.children && { renderAs: 'panelOpener' }),
        })),
      };
    }
    return node;
  });
