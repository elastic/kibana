/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { partition } from 'lodash/fp';
import { i18n } from '@kbn/i18n';
import type {
  AppDeepLinkId,
  NodeDefinition,
  NavigationTreeDefinition,
  RootNavigationItemDefinition,
} from '@kbn/core-chrome-browser';
import type { LinkCategory } from '@kbn/security-solution-navigation';
import {
  isSeparatorLinkCategory,
  isTitleLinkCategory,
  isAccordionLinkCategory,
} from '@kbn/security-solution-navigation';
import type { ProjectNavigationLink, ProjectPageName } from '../links/types';
import { getNavLinkIdFromProjectPageName, isBottomNavItemId, isCloudLink } from '../links/util';
import { isBreadcrumbHidden } from './utils';
import { ExternalPageName } from '../links/constants';

const SECURITY_PROJECT_TITLE = i18n.translate(
  'xpack.securitySolutionServerless.nav.solution.title',
  {
    defaultMessage: 'Security',
  }
);

export const formatNavigationTree = (
  projectNavLinks: ProjectNavigationLink[],
  bodyCategories: Readonly<Array<LinkCategory<ProjectPageName>>>,
  footerCategories: Readonly<Array<LinkCategory<ProjectPageName>>>
): NavigationTreeDefinition => {
  const [bodyNavItems, footerNavItems] = partition(
    ({ id }) => !isBottomNavItemId(id),
    projectNavLinks
  );

  const bodyChildren = addMainLinksPanelOpenerProp(
    formatNodesFromLinks(bodyNavItems, bodyCategories)
  );
  return {
    body: [
      {
        type: 'navGroup',
        id: 'security_project_nav',
        title: SECURITY_PROJECT_TITLE,
        icon: 'logoSecurity',
        breadcrumbStatus: 'hidden',
        defaultIsCollapsed: false,
        children: bodyChildren,
        isCollapsible: false,
      },
    ],
    footer: formatFooterNodesFromLinks(footerNavItems, footerCategories),
  };
};

// Body

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

    const id = isTitleLinkCategory(category) ? getCategoryIdFromLabel(category.label) : undefined;

    return [
      {
        id,
        ...(isTitleLinkCategory(category) && { title: category.label }),
        breadcrumbStatus: 'hidden',
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

// Footer

const formatFooterNodesFromLinks = (
  projectNavLinks: ProjectNavigationLink[],
  parentCategories?: Readonly<Array<LinkCategory<ProjectPageName>>>
): RootNavigationItemDefinition[] => {
  const nodes: RootNavigationItemDefinition[] = [];
  if (parentCategories?.length) {
    parentCategories.forEach((category) => {
      if (isSeparatorLinkCategory(category)) {
        nodes.push(
          ...category.linkIds.reduce<RootNavigationItemDefinition[]>((acc, linkId) => {
            const projectNavLink = projectNavLinks.find(({ id }) => id === linkId);
            if (projectNavLink != null) {
              acc.push({
                type: 'navItem',
                link: getNavLinkIdFromProjectPageName(projectNavLink.id) as AppDeepLinkId,
                title: projectNavLink.title,
                icon: projectNavLink.sideNavIcon,
              });
            }
            return acc;
          }, [])
        );
      }
      if (isAccordionLinkCategory(category)) {
        nodes.push({
          type: 'navGroup',
          id: getCategoryIdFromLabel(category.label),
          title: category.label,
          icon: category.iconType,
          breadcrumbStatus: 'hidden',
          children:
            category.linkIds?.reduce<NodeDefinition[]>((acc, linkId) => {
              const projectNavLink = projectNavLinks.find(({ id }) => id === linkId);
              if (projectNavLink != null) {
                acc.push({
                  title: projectNavLink.title,
                  ...(isCloudLink(projectNavLink.id)
                    ? {
                        cloudLink: getCloudLink(projectNavLink.id),
                        openInNewTab: true,
                      }
                    : {
                        link: getNavLinkIdFromProjectPageName(projectNavLink.id) as AppDeepLinkId,
                      }),
                });
              }
              return acc;
            }, []) ?? [],
        });
      }
    }, []);
  }
  return nodes;
};

// Utils

const getCategoryIdFromLabel = (label: string): string =>
  `category-${label.toLowerCase().replace(' ', '_')}`;

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

/** Returns the cloud link entry the default navigation expects */
const getCloudLink = (id: ProjectPageName) => {
  switch (id) {
    case ExternalPageName.cloudUsersAndRoles:
      return 'userAndRoles';
    case ExternalPageName.cloudBilling:
      return 'billingAndSub';
    default:
      return undefined;
  }
};
