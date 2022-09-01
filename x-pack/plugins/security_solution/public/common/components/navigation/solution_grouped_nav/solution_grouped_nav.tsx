/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, useCallback, useMemo, useRef, useState } from 'react';
import {
  EuiListGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  useIsWithinBreakpoints,
} from '@elastic/eui';

import classNames from 'classnames';
import { SolutionNavPanel } from './solution_grouped_nav_panel';
import { EuiListGroupItemStyled } from './solution_grouped_nav.styles';
import type { DefaultSideNavItem, SideNavItem } from './types';
import { isCustomItem, isDefaultItem } from './types';
import { EuiIconSpaces } from './icons/spaces';
import type { LinkCategories } from '../../../links';

export interface SolutionGroupedNavProps {
  items: SideNavItem[];
  selectedId: string;
  footerItems?: SideNavItem[];
  bottomOffset?: string;
}
export interface SolutionNavItemsProps {
  items: SideNavItem[];
  selectedId: string;
  activePanelNavId: ActivePanelNav;
  isMobileSize: boolean;
  navItemsById: NavItemsById;
  onOpenPanelNav: (id: string) => void;
}
export interface SolutionNavItemProps {
  item: SideNavItem;
  isSelected: boolean;
  isActive: boolean;
  hasPanelNav: boolean;
  onOpenPanelNav: (id: string) => void;
}

type ActivePanelNav = string | null;
type NavItemsById = Record<
  string,
  { title: string; panelItems: DefaultSideNavItem[]; categories?: LinkCategories }
>;

export const SolutionGroupedNavComponent: React.FC<SolutionGroupedNavProps> = ({
  items,
  selectedId,
  footerItems = [],
  bottomOffset,
}) => {
  const isMobileSize = useIsWithinBreakpoints(['xs', 's']);

  const [activePanelNavId, setActivePanelNavId] = useState<ActivePanelNav>(null);
  const activePanelNavIdRef = useRef<ActivePanelNav>(null);

  const openPanelNav = (id: string) => {
    activePanelNavIdRef.current = id;
    setActivePanelNavId(id);
  };

  const onClosePanelNav = useCallback(() => {
    activePanelNavIdRef.current = null;
    setActivePanelNavId(null);
  }, []);

  const onOutsidePanelClick = useCallback(() => {
    const currentPanelNavId = activePanelNavIdRef.current;
    setTimeout(() => {
      // This event is triggered on outside click.
      // Closing the side nav at the end of event loop to make sure it
      // closes also if the active panel button has been clicked (toggle),
      // but it does not close if any any other panel open button has been clicked.
      if (activePanelNavIdRef.current === currentPanelNavId) {
        onClosePanelNav();
      }
    });
  }, [onClosePanelNav]);

  const navItemsById = useMemo<NavItemsById>(
    () =>
      [...items, ...footerItems].reduce<NavItemsById>((acc, navItem) => {
        if (isDefaultItem(navItem) && navItem.items && navItem.items.length > 0) {
          acc[navItem.id] = {
            title: navItem.label,
            panelItems: navItem.items,
            categories: navItem.categories,
          };
        }
        return acc;
      }, {}),
    [items, footerItems]
  );

  const portalNav = useMemo(() => {
    if (activePanelNavId == null || !navItemsById[activePanelNavId]) {
      return null;
    }
    const { panelItems, title, categories } = navItemsById[activePanelNavId];
    return (
      <SolutionNavPanel
        onClose={onClosePanelNav}
        onOutsideClick={onOutsidePanelClick}
        items={panelItems}
        title={title}
        categories={categories}
        bottomOffset={bottomOffset}
      />
    );
  }, [activePanelNavId, bottomOffset, navItemsById, onClosePanelNav, onOutsidePanelClick]);

  return (
    <>
      <EuiFlexGroup gutterSize="none" direction="column">
        <EuiFlexItem>
          <EuiFlexGroup gutterSize="none" direction="column">
            <EuiFlexItem>
              <EuiListGroup gutterSize="none">
                <SolutionNavItems
                  items={items}
                  selectedId={selectedId}
                  activePanelNavId={activePanelNavId}
                  isMobileSize={isMobileSize}
                  navItemsById={navItemsById}
                  onOpenPanelNav={openPanelNav}
                />
              </EuiListGroup>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiListGroup gutterSize="none">
                <SolutionNavItems
                  items={footerItems}
                  selectedId={selectedId}
                  activePanelNavId={activePanelNavId}
                  isMobileSize={isMobileSize}
                  navItemsById={navItemsById}
                  onOpenPanelNav={openPanelNav}
                />
              </EuiListGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>

      {portalNav}
    </>
  );
};
export const SolutionGroupedNav = React.memo(SolutionGroupedNavComponent);

const SolutionNavItems: React.FC<SolutionNavItemsProps> = ({
  items,
  selectedId,
  activePanelNavId,
  isMobileSize,
  navItemsById,
  onOpenPanelNav,
}) => (
  <>
    {items.map((item) => (
      <SolutionNavItem
        key={item.id}
        item={item}
        isSelected={selectedId === item.id}
        isActive={activePanelNavId === item.id}
        hasPanelNav={!isMobileSize && item.id in navItemsById}
        onOpenPanelNav={onOpenPanelNav}
      />
    ))}
  </>
);

const SolutionNavItemComponent: React.FC<SolutionNavItemProps> = ({
  item,
  isSelected,
  isActive,
  hasPanelNav,
  onOpenPanelNav,
}) => {
  if (isCustomItem(item)) {
    return <Fragment key={item.id}>{item.render(isSelected)}</Fragment>;
  }
  const { id, href, label, onClick } = item;

  const itemClassNames = classNames('solutionGroupedNavItem', {
    'solutionGroupedNavItem--isActive': isActive,
    'solutionGroupedNavItem--isPrimary': isSelected,
  });
  const buttonClassNames = classNames('solutionGroupedNavItemButton');

  const onButtonClick: React.MouseEventHandler = (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    onOpenPanelNav(id);
  };

  return (
    // eslint-disable-next-line @elastic/eui/href-or-on-click
    <EuiLink
      key={id}
      href={href}
      onClick={onClick}
      color={isSelected ? 'primary' : 'text'}
      data-test-subj={`groupedNavItemLink-${id}`}
    >
      <EuiListGroupItemStyled
        className={itemClassNames}
        color={isSelected ? 'primary' : 'text'}
        label={label}
        size="s"
        {...(hasPanelNav
          ? {
              extraAction: {
                className: buttonClassNames,
                color: isActive ? 'primary' : 'text',
                onClick: onButtonClick,
                iconType: EuiIconSpaces,
                iconSize: 'm',
                'aria-label': 'Toggle group nav',
                'data-test-subj': `groupedNavItemButton-${id}`,
                alwaysShow: true,
              },
            }
          : {})}
      />
    </EuiLink>
  );
};
const SolutionNavItem = React.memo(SolutionNavItemComponent);
