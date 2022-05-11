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
import { SolutionGroupedNavPanel } from './solution_grouped_nav_panel';
import { EuiListGroupItemStyled } from './solution_grouped_nav.styles';
import {
  isCustomNavItem,
  isDefaultNavItem,
  NavItem,
  PortalNavItem,
} from './solution_grouped_nav_item';
import { EuiIconSpaces } from './icons/spaces';

export interface SolutionGroupedNavProps {
  items: NavItem[];
  selectedId: string;
  footerItems?: NavItem[];
}
type ActivePortalNav = string | null;

export const SolutionGroupedNavComponent: React.FC<SolutionGroupedNavProps> = ({
  items,
  selectedId,
  footerItems = [],
}) => {
  const isMobileSize = useIsWithinBreakpoints(['xs', 's']);

  const [activePortalNavId, setActivePortalNavId] = useState<ActivePortalNav>(null);
  const activePortalNavIdRef = useRef<ActivePortalNav>(null);

  const openPortalNav = (navId: string) => {
    activePortalNavIdRef.current = navId;
    setActivePortalNavId(navId);
  };

  const closePortalNav = () => {
    activePortalNavIdRef.current = null;
    setActivePortalNavId(null);
  };

  const onClosePortalNav = useCallback(() => {
    const currentPortalNavId = activePortalNavIdRef.current;
    setTimeout(() => {
      // This event is triggered on outside click.
      // Closing the side nav at the end of event loop to make sure it
      // closes also if the active "nav group" button has been clicked (toggle),
      // but it does not close if any some other "nav group" open button has been clicked.
      if (activePortalNavIdRef.current === currentPortalNavId) {
        closePortalNav();
      }
    });
  }, []);

  const navItemsById = useMemo(
    () =>
      [...items, ...footerItems].reduce<
        Record<string, { title: string; subItems: PortalNavItem[] }>
      >((acc, navItem) => {
        if (isDefaultNavItem(navItem) && navItem.items && navItem.items.length > 0) {
          acc[navItem.id] = {
            title: navItem.label,
            subItems: navItem.items,
          };
        }
        return acc;
      }, {}),
    [items, footerItems]
  );

  const portalNav = useMemo(() => {
    if (activePortalNavId == null || !navItemsById[activePortalNavId]) {
      return null;
    }
    const { subItems, title } = navItemsById[activePortalNavId];
    return <SolutionGroupedNavPanel onClose={onClosePortalNav} items={subItems} title={title} />;
  }, [activePortalNavId, navItemsById, onClosePortalNav]);

  const renderNavItem = useCallback(
    (navItem: NavItem) => {
      if (isCustomNavItem(navItem)) {
        return <Fragment key={navItem.id}>{navItem.render()}</Fragment>;
      }
      const { id, href, label, onClick } = navItem;
      const isActive = activePortalNavId === id;
      const isCurrentNav = selectedId === id;

      const itemClassNames = classNames('solutionGroupedNavItem', {
        'solutionGroupedNavItem--isActive': isActive,
        'solutionGroupedNavItem--isPrimary': isCurrentNav,
      });
      const buttonClassNames = classNames('solutionGroupedNavItemButton');

      return (
        // eslint-disable-next-line @elastic/eui/href-or-on-click
        <EuiLink
          key={id}
          href={href}
          onClick={onClick}
          color={isCurrentNav ? 'primary' : 'text'}
          data-test-subj={`groupedNavItemLink-${id}`}
        >
          <EuiListGroupItemStyled
            className={itemClassNames}
            isActive={isActive}
            color={isCurrentNav ? 'primary' : 'text'}
            label={label}
            size="s"
            {...(!isMobileSize && navItemsById[id] != null
              ? {
                  extraAction: {
                    className: buttonClassNames,
                    color: isActive ? 'primary' : 'text',
                    onClick: (ev) => {
                      ev.preventDefault();
                      ev.stopPropagation();
                      openPortalNav(id);
                    },
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
    },
    [activePortalNavId, isMobileSize, navItemsById, selectedId]
  );

  return (
    <>
      <EuiFlexGroup gutterSize="none" direction="column">
        <EuiFlexItem>
          <EuiFlexGroup gutterSize="none" direction="column">
            <EuiFlexItem>
              <EuiListGroup gutterSize="none">{items.map(renderNavItem)}</EuiListGroup>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiListGroup gutterSize="none">{footerItems.map(renderNavItem)}</EuiListGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>

      {portalNav}
    </>
  );
};

export const SolutionGroupedNav = React.memo(SolutionGroupedNavComponent);
