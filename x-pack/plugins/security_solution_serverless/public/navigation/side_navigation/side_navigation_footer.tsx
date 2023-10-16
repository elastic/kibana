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
import type { SolutionSideNavItem } from '@kbn/security-solution-side-nav';
import { ExternalPageName } from '../links/constants';

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
      ExternalPageName.cloudBilling,
    ],
  },
];

export const SideNavigationFooter: React.FC<{
  selectedId: string;
  items: SolutionSideNavItem[];
}> = ({ selectedId, items }) => {
  return (
    <>
      {categories.map((category, index) => {
        const categoryItems = items.filter((item) => category.linkIds.includes(item.id));
        if (category.type === 'standalone') {
          return (
            <SideNavigationFooterStandalone
              key={index}
              items={categoryItems}
              selectedId={selectedId}
            />
          );
        }
        if (category.type === 'collapsible') {
          return (
            <SideNavigationFooterCollapsible
              key={index}
              title={category.title ?? ''}
              items={categoryItems}
              selectedId={selectedId}
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
  items: SolutionSideNavItem[];
  selectedId: string;
}> = ({ items, selectedId }) => (
  <>
    {items.map((item) => (
      <EuiCollapsibleNavItem
        key={item.id}
        id={item.id}
        title={item.label}
        icon={item.iconType}
        iconProps={{ size: 'm' }}
        data-test-subj={`nav-bucket-${item.id}`}
        href={item.href}
        onClick={item.onClick}
        isSelected={item.id === selectedId}
        linkProps={{ external: item.openInNewTab }}
      />
    ))}
  </>
);

const SideNavigationFooterCollapsible: React.FC<{
  title: string;
  items: SolutionSideNavItem[];
  selectedId: string;
  icon?: IconType;
}> = ({ title, icon, items, selectedId }) => {
  const hasSelected = useMemo(() => items.some(({ id }) => id === selectedId), [selectedId, items]);
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
      items={items.map((item) => formatCollapsibleItem(item, selectedId))}
    />
  );
};

const formatCollapsibleItem = (
  sideNavItem: SolutionSideNavItem,
  selectedId: string
): EuiCollapsibleNavSubItemProps => {
  return {
    'data-test-subj': `solutionSideNavItemLink-${sideNavItem.id}`,
    id: sideNavItem.id,
    title: sideNavItem.label,
    isSelected: sideNavItem.id === selectedId,
    href: sideNavItem.href,
    ...(sideNavItem.openInNewTab && { target: '_blank' }),
    onClick: sideNavItem.onClick,
    icon: sideNavItem.iconType,
    iconProps: { size: 's' },
  };
};
