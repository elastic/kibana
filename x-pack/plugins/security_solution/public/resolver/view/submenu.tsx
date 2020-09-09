/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable no-duplicate-imports */

/* eslint-disable react/display-name */

import { i18n } from '@kbn/i18n';
import React, { useState, useCallback, useRef, useLayoutEffect } from 'react';
import {
  EuiI18nNumber,
  EuiButton,
  EuiPopover,
  ButtonColor,
} from '@elastic/eui';
import styled from 'styled-components';
import { Matrix3 } from '../types';

/**
 * i18n-translated titles for submenus and identifiers for display of states:
 *   initialMenuStatus: submenu before it has been opened / requested data
 *   menuError: if the submenu requested data, but received an error
 */
export const subMenuAssets = {
  initialMenuStatus: i18n.translate(
    'xpack.securitySolution.endpoint.resolver.relatedNotRetrieved',
    {
      defaultMessage: 'Related Events have not yet been retrieved.',
    }
  ),
  menuError: i18n.translate('xpack.securitySolution.endpoint.resolver.relatedRetrievalError', {
    defaultMessage: 'There was an error retrieving related events.',
  }),
  relatedEvents: {
    title: i18n.translate('xpack.securitySolution.endpoint.resolver.relatedEvents', {
      defaultMessage: 'Events',
    }),
  },
};

interface ResolverSubmenuOption {
  optionTitle: string;
  action: () => unknown;
  prefix?: number | JSX.Element;
}

export type ResolverSubmenuOptionList = ResolverSubmenuOption[] | string;

/**
 * This will be the "host button" that displays the "total number of related events" and opens
 * the sumbmenu (with counts by category) when clicked.
 */
const DetailHostButton = React.memo(({hasMenu, menuIsOpen, action, count, title, buttonBorderColor, nodeID}: {hasMenu: boolean, menuIsOpen?: boolean, action: (evt: React.MouseEvent<HTMLButtonElement, MouseEvent>)=>void, count?: number, title: string, buttonBorderColor: ButtonColor, nodeID: string})=>{
  const hasIcon = hasMenu ?? false;
  const iconType = menuIsOpen === true ? 'arrowUp' : 'arrowDown';
  return (
    <EuiButton
      onClick={action}
      iconType={hasIcon ? iconType : 'none'}
      color={buttonBorderColor}
      size="s"
      iconSide="right"
      tabIndex={-1}
      data-test-subj="resolver:submenu:button"
      data-test-resolver-node-id={nodeID}
    >
      {count ? <EuiI18nNumber value={count} /> : ''} {title}
    </EuiButton>
  )
})

/**
 * A Submenu to be displayed in one of two forms:
 *   1) Provided a collection of `optionsWithActions`: it will call `menuAction` then - if and when menuData becomes available - display each item with an optional prefix and call the supplied action for the options when that option is clicked.
 *   2) Provided `optionsWithActions` is undefined, it will call the supplied `menuAction` when its host button is clicked.
 */
const NodeSubMenuComponents = React.memo(
  ({
    count,
    buttonBorderColor,
    menuTitle,
    menuAction,
    optionsWithActions,
    className,
    projectionMatrix,
    nodeID,
  }: {
    menuTitle: string;
    className?: string;
    menuAction?: () => unknown;
    buttonBorderColor: ButtonColor;
    buttonFill: string;
    count?: number;
    /**
     * Receive the projection matrix, so we can see when the camera position changed, so we can force the submenu to reposition itself.
     */
    projectionMatrix: Matrix3;
    nodeID: string;
  } & {
    optionsWithActions?: ResolverSubmenuOptionList | string | undefined;
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

    if (!optionsWithActions) {
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
            {menuTitle}
          </EuiButton>
        </div>
      );
    }
    
    if(typeof optionsWithActions === 'string') {
      return (<></>)
    }

    return (
      <>
        <DetailHostButton
          hasMenu={true} 
          menuIsOpen={menuIsOpen}
          action={handleMenuOpenClick}
          count={count}
          title={menuTitle}
          buttonBorderColor={buttonBorderColor} 
          nodeID={nodeID}
        />
        <ul role="menu" className={className + ' options'} aria-hidden={menuIsOpen} aria-owns={nodeID}>
          { optionsWithActions.sort((opta, optb)=>{ return opta.optionTitle < optb.optionTitle ? -1 : 1 }).map((opt)=>{
            return (<li className="item"><button role="menuitem">{opt.prefix} {opt.optionTitle}</button></li>)
          })}
        </ul>
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
    font-size: .8em;
    display: flex;
    flex-flow: row wrap;
    background: transparent;
    position: absolute;
    top: 6em;
    contain: content;
    width: 13em;
    z-index: 2;
  }

  &.options .item {
    margin: .25ch .35ch .35ch 0;
    padding: .25em;
    border: 1px solid red;
    height: fit-content;
    width: fit-content;
    line-height: .8;
    background-color: ${(props) => props.buttonFill};
  }

  &.options .item button {
    appearance: none;
    height: fit-content;
    width: fit-content;
    line-height: .8;
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
