/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import type { EuiCollapsibleNavSubItemProps, IconType } from '@elastic/eui';
import { EuiCollapsibleNavItem } from '@elastic/eui';
import { SecurityPageName } from '@kbn/security-solution-navigation';
import { ExternalPageName } from '../links/constants';
import { getNavLinkIdFromProjectPageName } from '../links/util';
import type { ProjectSideNavItem } from './types';

interface FooterCategory {
  type: 'standalone' | 'collapsible';
  title?: string;
  icon?: IconType;
  linkIds: string[];
}

const categories: FooterCategory[] = [
  { type: 'standalone', linkIds: [SecurityPageName.landing, ExternalPageName.devTools] },
  {
    type: 'collapsible',
    title: 'Project Settings',
    icon: 'gear',
    linkIds: [
      ExternalPageName.management,
      ExternalPageName.integrationsSecurity,
      ExternalPageName.cloudUsersAndRoles,
      ExternalPageName.cloudPerformance,
      ExternalPageName.cloudBilling,
    ],
  },
];

export const SideNavigationFooter: React.FC<{
  activeNodeId: string;
  items: ProjectSideNavItem[];
}> = ({ activeNodeId, items }) => {
  return (
    <>
      {categories.map((category, index) => {
        const categoryItems = category.linkIds.reduce<ProjectSideNavItem[]>((acc, linkId) => {
          const item = items.find(({ id }) => id === linkId);
          if (item) {
            acc.push(item);
          }
          return acc;
        }, []);

        if (category.type === 'standalone') {
          return (
            <SideNavigationFooterStandalone
              key={index}
              items={categoryItems}
              activeNodeId={activeNodeId}
            />
          );
        }
        if (category.type === 'collapsible') {
          return (
            <SideNavigationFooterCollapsible
              key={index}
              title={category.title ?? ''}
              items={categoryItems}
              activeNodeId={activeNodeId}
              icon={category.icon}
            />
          );
        }
        return null;
      })}
    </>
  );
};

const SideNavigationFooterStandalone: React.FC<{
  items: ProjectSideNavItem[];
  activeNodeId: string;
}> = ({ items, activeNodeId }) => (
  <>
    {items.map((item) => (
      <EuiCollapsibleNavItem
        key={item.id}
        id={item.id}
        title={item.label}
        icon={item.iconType}
        iconProps={{ size: 'm' }}
        data-test-subj={`solutionSideNavItemLink-${item.id}`}
        href={item.href}
        onClick={item.onClick}
        isSelected={getNavLinkIdFromProjectPageName(item.id) === activeNodeId}
        linkProps={{ external: item.openInNewTab }}
      />
    ))}
  </>
);

const SideNavigationFooterCollapsible: React.FC<{
  title: string;
  items: ProjectSideNavItem[];
  activeNodeId: string;
  icon?: IconType;
}> = ({ title, icon, items, activeNodeId }) => {
  const hasSelected = useMemo(
    () => items.some(({ id }) => getNavLinkIdFromProjectPageName(id) === activeNodeId),
    [activeNodeId, items]
  );
  const [isOpen, setIsOpen] = useState(hasSelected);
  const categoryId = useMemo(() => (title ?? '').toLowerCase().replace(' ', '-'), [title]);

  useEffect(() => {
    setIsOpen((open) => (!open ? hasSelected : true));
  }, [hasSelected]);

  return (
    <EuiCollapsibleNavItem
      key={categoryId}
      data-test-subj={`navFooterCollapsible-${categoryId}`}
      title={title}
      icon={icon}
      iconProps={{ size: 'm' }}
      accordionProps={{
        forceState: isOpen ? 'open' : 'closed',
        initialIsOpen: isOpen,
        onToggle: (open) => {
          setIsOpen(open);
        },
      }}
      items={items.map((item) => formatCollapsibleItem(item, activeNodeId))}
    />
  );
};

const formatCollapsibleItem = (
  sideNavItem: ProjectSideNavItem,
  activeNodeId: string
): EuiCollapsibleNavSubItemProps => {
  return {
    'data-test-subj': `solutionSideNavItemLink-${sideNavItem.id}`,
    id: sideNavItem.id,
    title: sideNavItem.label,
    isSelected: getNavLinkIdFromProjectPageName(sideNavItem.id) === activeNodeId,
    href: sideNavItem.href,
    ...(sideNavItem.openInNewTab && { target: '_blank' }),
    onClick: sideNavItem.onClick,
    icon: sideNavItem.iconType,
    iconProps: { size: 's' },
  };
};
