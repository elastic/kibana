/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React, { ReactNode, useState, useMemo, useCallback } from 'react';
import { EuiSelectable, EuiButton } from '@elastic/eui';
import styled from 'styled-components';

/**
 * i18n-translated titles for submenus and identifiers for display of states:
 *   initialMenuStatus: submenu before it has been opened / requested data
 *   menuError: if the submenu requested data, but received an error
 */
export const subMenuAssets = {
  initialMenuStatus: i18n.translate('xpack.siem.endpoint.resolver.relatedNotRetrieved', {
    defaultMessage: 'Related Events have not yet been retrieved.',
  }),
  menuError: i18n.translate('xpack.siem.endpoint.resolver.relatedRetrievalError', {
    defaultMessage: 'There was an error retrieving related events.',
  }),
  relatedAlerts: {
    title: i18n.translate('xpack.siem.endpoint.resolver.relatedAlerts', {
      defaultMessage: 'Related Alerts',
    }),
  },
  relatedEvents: {
    title: i18n.translate('xpack.siem.endpoint.resolver.relatedEvents', {
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

const OptionList = React.memo(
  ({
    subMenuOptions,
    isLoading,
  }: {
    subMenuOptions: ResolverSubmenuOptionList;
    isLoading: boolean;
  }) => {
    const [options, setOptions] = useState(() =>
      typeof subMenuOptions !== 'object'
        ? []
        : subMenuOptions.map((opt: ResolverSubmenuOption): {
            label: string;
            prepend?: ReactNode;
          } => {
            return opt.prefix
              ? {
                  label: opt.optionTitle,
                  prepend: <span>{opt.prefix} </span>,
                }
              : {
                  label: opt.optionTitle,
                  prepend: <span />,
                };
          })
    );
    return useMemo(
      () => (
        <EuiSelectable
          singleSelection={true}
          options={options}
          onChange={(newOptions) => {
            setOptions(newOptions);
          }}
          listProps={{ showIcons: true, bordered: true }}
          isLoading={isLoading}
        >
          {(list) => list}
        </EuiSelectable>
      ),
      [isLoading, options]
    );
  }
);

OptionList.displayName = 'OptionList';

/**
 * A Submenu to be displayed in one of two forms:
 *   1) Provided a collection of `optionsWithActions`: it will call `menuAction` then - if and when menuData becomes available - display each item with an optional prefix and call the supplied action for the options when that option is clicked.
 *   2) Provided `optionsWithActions` is undefined, it will call the supplied `menuAction` when its host button is clicked.
 */
const NodeSubMenuComponents = React.memo(
  ({
    menuTitle,
    menuAction,
    optionsWithActions,
    className,
  }: { menuTitle: string; className?: string; menuAction: () => unknown } & {
    optionsWithActions?: ResolverSubmenuOptionList | string | undefined;
  }) => {
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

    const isMenuLoading = optionsWithActions === 'waitingForRelatedEventData';

    if (!optionsWithActions) {
      /**
       * When called with a `menuAction`
       * Render without dropdown and call the supplied action when host button is clicked
       */
      return (
        <div className={className}>
          <EuiButton onClick={handleMenuActionClick} color="ghost" size="s" tabIndex={-1}>
            {menuTitle}
          </EuiButton>
        </div>
      );
    }
    /**
     * When called with a set of `optionsWithActions`:
     * Render with a panel of options that appear when the menu host button is clicked
     */
    return (
      <div className={className + (menuIsOpen ? ' is-open' : '')}>
        <EuiButton
          onClick={
            typeof optionsWithActions === 'object' ? handleMenuOpenClick : handleMenuActionClick
          }
          color="ghost"
          size="s"
          iconType={menuIsOpen ? 'arrowUp' : 'arrowDown'}
          iconSide="right"
          tabIndex={-1}
        >
          {menuTitle}
        </EuiButton>
        {menuIsOpen && typeof optionsWithActions === 'object' && (
          <OptionList isLoading={isMenuLoading} subMenuOptions={optionsWithActions} />
        )}
      </div>
    );
  }
);

NodeSubMenuComponents.displayName = 'NodeSubMenu';

export const NodeSubMenu = styled(NodeSubMenuComponents)`
  margin: 0;
  padding: 0;
  border: none;
  display: flex;
  flex-flow: column;
  &.is-open .euiButton {
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
  }
  &.is-open .euiSelectableListItem__prepend {
    color: white;
  }
`;
