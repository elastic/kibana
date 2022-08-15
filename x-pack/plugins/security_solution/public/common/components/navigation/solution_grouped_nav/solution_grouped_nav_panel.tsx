/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, useCallback } from 'react';
import {
  EuiDescriptionList,
  EuiDescriptionListDescription,
  EuiDescriptionListTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFocusTrap,
  EuiHorizontalRule,
  EuiOutsideClickDetector,
  EuiPortal,
  EuiSpacer,
  EuiTitle,
  EuiWindowEvent,
  keys,
  useIsWithinBreakpoints,
} from '@elastic/eui';
import classNames from 'classnames';
import { EuiPanelStyled, FlexLink } from './solution_grouped_nav_panel.styles';
import type { DefaultSideNavItem } from './types';
import type { LinkCategories } from '../../../links/types';
import { NavItemBetaBadge } from '../nav_item_beta_badge';

export interface SolutionNavPanelProps {
  onClose: () => void;
  onOutsideClick: () => void;
  title: string;
  items: DefaultSideNavItem[];
  categories?: LinkCategories;
  bottomOffset?: string;
}
export interface SolutionNavPanelCategoriesProps {
  categories: LinkCategories;
  items: DefaultSideNavItem[];
  onClose: () => void;
}
export interface SolutionNavPanelItemsProps {
  items: DefaultSideNavItem[];
  onClose: () => void;
}

/**
 * Renders the side navigation panel for secondary links
 */
const SolutionNavPanelComponent: React.FC<SolutionNavPanelProps> = ({
  onClose,
  onOutsideClick,
  title,
  categories,
  items,
  bottomOffset,
}) => {
  const isLargerBreakpoint = useIsWithinBreakpoints(['l', 'xl']);
  const panelClasses = classNames('eui-yScroll');

  // Only larger breakpoint needs to add bottom offset, other sizes should have full height
  const bottomOffsetLargerBreakpoint = isLargerBreakpoint ? bottomOffset : undefined;

  // ESC key closes PanelNav
  const onKeyDown = useCallback(
    (ev: KeyboardEvent) => {
      if (ev.key === keys.ESCAPE) {
        onClose();
      }
    },
    [onClose]
  );

  return (
    <>
      <EuiWindowEvent event="keydown" handler={onKeyDown} />
      <EuiPortal>
        <EuiFocusTrap autoFocus>
          <EuiOutsideClickDetector onOutsideClick={onOutsideClick}>
            <EuiPanelStyled
              className={panelClasses}
              hasShadow={!bottomOffsetLargerBreakpoint}
              $bottomOffset={bottomOffsetLargerBreakpoint}
              borderRadius="none"
              paddingSize="l"
              data-test-subj="groupedNavPanel"
            >
              <EuiFlexGroup direction="column" gutterSize="l" alignItems="flexStart">
                <EuiFlexItem>
                  <EuiTitle size="xs">
                    <strong>{title}</strong>
                  </EuiTitle>
                </EuiFlexItem>

                <EuiFlexItem>
                  <EuiDescriptionList>
                    {categories ? (
                      <SolutionNavPanelCategories
                        categories={categories}
                        items={items}
                        onClose={onClose}
                      />
                    ) : (
                      <SolutionNavPanelItems items={items} onClose={onClose} />
                    )}
                  </EuiDescriptionList>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanelStyled>
          </EuiOutsideClickDetector>
        </EuiFocusTrap>
      </EuiPortal>
    </>
  );
};
export const SolutionNavPanel = React.memo(SolutionNavPanelComponent);

const SolutionNavPanelCategories: React.FC<SolutionNavPanelCategoriesProps> = ({
  categories,
  items,
  onClose,
}) => {
  const itemsMap = new Map(items.map((item) => [item.id, item]));

  return (
    <>
      {categories.map(({ label, linkIds }) => {
        const links = linkIds.reduce<DefaultSideNavItem[]>((acc, linkId) => {
          const link = itemsMap.get(linkId);
          if (link) {
            acc.push(link);
          }
          return acc;
        }, []);

        if (!links.length) {
          return null;
        }

        return (
          <Fragment key={label}>
            <EuiTitle size="xxxs">
              <h2>{label}</h2>
            </EuiTitle>
            <EuiHorizontalRule margin="s" />
            <SolutionNavPanelItems items={links} onClose={onClose} />
            <EuiSpacer size="l" />
          </Fragment>
        );
      })}
    </>
  );
};

const SolutionNavPanelItems: React.FC<SolutionNavPanelItemsProps> = ({ items, onClose }) => (
  <>
    {items.map(({ id, href, onClick, label, description, isBeta }) => (
      <Fragment key={id}>
        <EuiDescriptionListTitle>
          <FlexLink
            data-test-subj={`groupedNavPanelLink-${id}`}
            href={href}
            onClick={(ev) => {
              onClose();
              if (onClick) {
                onClick(ev);
              }
            }}
          >
            {label}
            {isBeta && <NavItemBetaBadge />}
          </FlexLink>
        </EuiDescriptionListTitle>
        <EuiDescriptionListDescription>{description}</EuiDescriptionListDescription>
      </Fragment>
    ))}
  </>
);
