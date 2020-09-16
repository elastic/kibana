/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable react/display-name */

import { i18n } from '@kbn/i18n';
import React, { useState, useCallback, useRef, useLayoutEffect, useMemo } from 'react';
import { EuiI18nNumber, EuiButton, EuiPopover, ButtonColor } from '@elastic/eui';
import styled from 'styled-components';
import { FormattedMessage } from '@kbn/i18n/react';
import { ResolverNodeStats } from '../../../common/endpoint/types';
import { useRelatedEventByCategoryNavigation } from './use_related_event_by_category_navigation';
import { Matrix3 } from '../types';
import { useResolverTheme } from './assets';

interface ResolverSubmenuOption {
  optionTitle: string;
  action: () => unknown;
  prefix?: number | JSX.Element;
}

export type ResolverSubmenuOptionList = ResolverSubmenuOption[] | string;

const StyledActionButton = styled(EuiButton)`
  &.euiButton--small {
    height: fit-content;
    line-height: 1;
    padding: 0.25em;
    font-size: 0.85rem;
  }
`;

/**
 * This will be the "host button" that displays the "total number of related events" and opens
 * the sumbmenu (with counts by category) when clicked.
 */
const Button = React.memo(
  ({
    menuIsOpen,
    action,
    count,
    nodeID,
  }: {
    menuIsOpen?: boolean;
    action: (evt: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
    count?: number;
    nodeID: string;
  }) => {
    const iconType = menuIsOpen === true ? 'arrowUp' : 'arrowDown';
    return (
      <StyledActionButton
        onClick={action}
        iconType={iconType}
        fill={false}
        color="primary"
        size="s"
        iconSide="right"
        tabIndex={-1}
        data-test-subj="resolver:submenu:button"
        data-test-resolver-node-id={nodeID}
      >
        <FormattedMessage
          id="xpack.securitySolution.resolver.nodeEventMenuButton.label"
          defaultMessage="{count} Events"
          values={{ count }}
        />
      </StyledActionButton>
    );
  }
);

/**
 * A Submenu to be displayed in one of two forms:
 *   1) Provided a collection of `optionsWithActions`: it will call `menuAction` then - if and when menuData becomes available - display each item with an optional prefix and call the supplied action for the options when that option is clicked.
 *   2) Provided `optionsWithActions` is undefined, it will call the supplied `menuAction` when its host button is clicked.
 */
const NodeSubMenuComponents = React.memo(
  ({
    count,
    buttonBorderColor,
    menuAction,
    className,
    projectionMatrix,
    nodeID,
    relatedEventStats,
  }: {
    className?: string;
    menuAction?: () => unknown;
    buttonBorderColor: ButtonColor;
    // eslint-disable-next-line react/no-unused-prop-types
    buttonFill: string;
    count?: number;
    /**
     * Receive the projection matrix, so we can see when the camera position changed, so we can force the submenu to reposition itself.
     */
    projectionMatrix: Matrix3;
    nodeID: string;
    relatedEventStats: ResolverNodeStats | undefined;
  }) => {
    // keep a ref to the popover so we can call its reposition method
    const popoverRef = useRef<EuiPopover>(null);

    const [menuIsOpen, setMenuOpen] = useState(false);
    const handleMenuOpenClick = useCallback(
      (clickEvent: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        // stopping propagation/default to prevent other node animations from triggering
        clickEvent.preventDefault();
        clickEvent.stopPropagation();
        setMenuOpen(!menuIsOpen);
      },
      [menuIsOpen]
    );
    const handleMenuActionClick = useCallback(
      (clickEvent: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        // stopping propagation/default to prevent other node animations from triggering
        clickEvent.preventDefault();
        clickEvent.stopPropagation();
        if (typeof menuAction === 'function') menuAction();
        setMenuOpen(true);
      },
      [menuAction]
    );

    // The last projection matrix that was used to position the popover
    const projectionMatrixAtLastRender = useRef<Matrix3>();
    const relatedEventCallbacks = useRelatedEventByCategoryNavigation({
      nodeID,
      categories: relatedEventStats?.events?.byCategory,
    });
    const relatedEventOptions = useMemo(() => {
      if (relatedEventStats === undefined) {
        return [];
      } else {
        return Object.entries(relatedEventStats.events.byCategory).map(([category, total]) => {
          return {
            prefix: <EuiI18nNumber value={total || 0} />,
            optionTitle: category,
            action: () => relatedEventCallbacks(category),
          };
        });
      }
    }, [relatedEventStats, relatedEventCallbacks]);

    useLayoutEffect(() => {
      if (
        /**
         * If there is a popover component reference,
         * and this isn't the first render,
         * and the projectionMatrix has changed since last render,
         * then force the popover to reposition itself.
         */
        popoverRef.current &&
        projectionMatrixAtLastRender.current &&
        projectionMatrixAtLastRender.current !== projectionMatrix
      ) {
        popoverRef.current.positionPopoverFixed();
      }

      // no matter what, keep track of the last project matrix that was used to size the popover
      projectionMatrixAtLastRender.current = projectionMatrix;
    }, [projectionMatrixAtLastRender, projectionMatrix]);
    const {
      colorMap: { pillStroke: pillBorderStroke, resolverBackground: pillFill },
    } = useResolverTheme();
    const listStylesFromTheme = useMemo(() => {
      return {
        border: `1.5px solid ${pillBorderStroke}`,
        backgroundColor: pillFill,
      };
    }, [pillBorderStroke, pillFill]);
    if (relatedEventStats === undefined) {
      /**
       * When called with a `menuAction`
       * Render without dropdown and call the supplied action when host button is clicked
       */
      return (
        <div className={className}>
          <EuiButton
            onClick={handleMenuActionClick}
            color={buttonBorderColor}
            size="s"
            tabIndex={-1}
          >
            {i18n.translate('xpack.securitySolution.endpoint.resolver.relatedEvents', {
              defaultMessage: 'Events',
            })}
          </EuiButton>
        </div>
      );
    }

    if (relatedEventOptions === undefined) {
      return null;
    }

    return (
      <>
        <Button
          menuIsOpen={menuIsOpen}
          action={handleMenuOpenClick}
          count={count}
          nodeID={nodeID}
        />
        {menuIsOpen ? (
          <ul
            className={`${className} options`}
            aria-hidden={!menuIsOpen}
            aria-describedby={nodeID}
          >
            {relatedEventOptions
              .sort((opta, optb) => {
                return opta.optionTitle.localeCompare(optb.optionTitle);
              })
              .map((opt) => {
                return (
                  <li
                    className="item"
                    data-test-subj="resolver:map:node-submenu-item"
                    style={listStylesFromTheme}
                  >
                    <button type="button" className="kbn-resetFocusState" onClick={opt.action}>
                      {opt.prefix} {opt.optionTitle}
                    </button>
                  </li>
                );
              })}
          </ul>
        ) : null}
      </>
    );
  }
);

export const NodeSubMenu = styled(NodeSubMenuComponents)`
  margin: 2px 0 0 0;
  padding: 0;
  border: none;
  display: flex;
  flex-flow: column;

  &.options {
    font-size: 0.8rem;
    display: flex;
    flex-flow: row wrap;
    background: transparent;
    position: absolute;
    top: 6.5em;
    contain: content;
    width: 12em;
    z-index: 2;
  }

  &.options .item {
    margin: 0.25ch 0.35ch 0.35ch 0;
    padding: 0.35em 0.5em;
    height: fit-content;
    width: fit-content;
    border-radius: 2px;
    line-height: 0.8;
  }

  &.options .item button {
    appearance: none;
    height: fit-content;
    width: fit-content;
    line-height: 0.8;
    outline-style: none;
    border-color: transparent;
    box-shadow: none;
  }

  &.options .item button:focus {
    outline-style: none;
    border-color: transparent;
    box-shadow: none;
    text-decoration: underline;
  }

  &.options .item button:active {
    transform: scale(0.95);
  }

  & .euiButton {
    background-color: ${(props) => props.buttonFill};
    border-color: ${(props) => props.buttonBorderColor};
    border-style: solid;
    border-width: 1px;

    &:hover,
    &:active,
    &:focus {
      background-color: ${(props) => props.buttonFill};
    }
  }
`;
