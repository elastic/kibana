/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiCollapsibleNavSubItemProps } from '@elastic/eui';
import { EuiCollapsibleNavItem } from '@elastic/eui';
import { SecurityPageName } from '@kbn/security-solution-navigation';
import type { SolutionSideNavItem } from '@kbn/security-solution-side-nav';
import { ExternalPageName } from '../links/constants';

interface FooterCategory {
  type: 'placeholder' | 'collapsible';
  title?: string;
  icon?: string;
  linkIds: string[];
}

const categories: FooterCategory[] = [
  { type: 'placeholder', linkIds: [SecurityPageName.landing, ExternalPageName.devTools] },
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
        if (category.type === 'placeholder') {
          return (
            <React.Fragment key={`placeholder-${index}`}>
              {categoryItems.map((item) => (
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
            </React.Fragment>
          );
        }
        if (category.type === 'collapsible') {
          const id = (category.title ?? '').toLowerCase().replace(' ', '-');
          const isSelected = category.linkIds.includes(selectedId);
          return (
            <EuiCollapsibleNavItem
              key={id}
              data-test-subj={`navFooter-${id}`}
              title={category.title ?? ''}
              icon={category.icon}
              iconProps={{ size: 'm' }}
              //   isCollapsible={true}
              //   initialIsOpen={true}
              accordionProps={{
                forceState: isSelected ? 'open' : undefined,
                initialIsOpen: isSelected,
              }}
              items={categoryItems.map((item) => formatCollapsibleItem(item, selectedId))}
            />
          );
        }
        return null;
      })}
    </>
  );
};

const formatCollapsibleItem = (
  sideNavItem: SolutionSideNavItem,
  selectedId: string
): EuiCollapsibleNavSubItemProps => {
  return {
    id: sideNavItem.id,
    title: sideNavItem.label,
    isSelected: sideNavItem.id === selectedId,
    linkProps: { external: sideNavItem.openInNewTab },
    onClick: sideNavItem.onClick,
    href: sideNavItem.href,
    'data-test-subj': `nav-item-${sideNavItem.id}`,
    icon: sideNavItem.iconType,
    iconProps: { size: 's' },
  };
};
