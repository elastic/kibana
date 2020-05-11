/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React, { ReactNode, useState, useMemo, useCallback } from 'react';
import { EuiSelectable, EuiButton } from '@elastic/eui';
import styled from 'styled-components';
import { waitingForRelatedEventData } from '../types';

export const subMenuAssets = {
  initialMenuStatus: Symbol(
    'The state of a Resolver submenu before it has been opened or requested data.'
  ),
  menuError: Symbol('The options in this submenu cannot be displayed because of an error'),
  relatedAlerts: {
    title: i18n.translate('xpack.endpoint.resolver.relatedAlerts', {
      defaultMessage: 'Related Alerts',
    }),
  },
  relatedEvents: {
    title: i18n.translate('xpack.endpoint.resolver.relatedEvents', {
      defaultMessage: 'Events',
    }),
  },
};

interface ResolverSubmenuOption {
  optionTitle: string;
  action: () => unknown;
  prefix?: number | JSX.Element;
}

export type ResolverSubmenuOptionList = ResolverSubmenuOption[] | symbol;

const OptionList = React.memo(
  ({
    subMenuOptions,
    isLoading,
  }: {
    subMenuOptions: ResolverSubmenuOptionList;
    isLoading: boolean;
  }) => {
    const selectableOptions =
      typeof subMenuOptions === 'symbol'
        ? []
        : subMenuOptions.map((opt: ResolverSubmenuOption): {
            label: string;
            prepend?: ReactNode;
          } => {
            return opt.prefix
              ? {
                  label: opt.optionTitle,
                  prepend: <span>{opt.prefix}</span>,
                }
              : {
                  label: opt.optionTitle,
                  prepend: <span />,
                };
          });
    const [options, setOptions] = useState(selectableOptions);
    return useMemo(
      () => (
        <EuiSelectable
          singleSelection={true}
          options={options}
          onChange={newOptions => {
            setOptions(newOptions);
          }}
          listProps={{ showIcons: true, bordered: true }}
          isLoading={isLoading}
        >
          {list => list}
        </EuiSelectable>
      ),
      [isLoading, options]
    );
  }
);

export const NodeSubMenu = styled(
  React.memo(
    ({
      menuTitle,
      menuAction,
      optionsWithActions,
      className,
    }: { menuTitle: string; className?: string; menuAction: () => unknown } & (
      | {
          optionsWithActions:
            | ResolverSubmenuOptionList
            | typeof subMenuAssets.initialMenuStatus
            | typeof waitingForRelatedEventData;
        }
      | { optionsWithActions?: undefined }
    )) => {
      const [menuIsOpen, setMenuOpen] = useState(false);
      const handleMenuOpenClick = useCallback(
        (clickEvent: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
          clickEvent.preventDefault();
          clickEvent.stopPropagation();
          setMenuOpen(!menuIsOpen);
        },
        [menuIsOpen]
      );
      const handleMenuActionClick = useCallback(
        (clickEvent: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
          clickEvent.preventDefault();
          clickEvent.stopPropagation();
          if (typeof menuAction === 'function') menuAction();
          setMenuOpen(true);
        },
        [menuAction]
      );
      const isMenuDataAvailable = useMemo(() => {
        return typeof optionsWithActions === 'object';
      }, [optionsWithActions]);

      const isMenuLoading = useMemo(() => {
        return optionsWithActions === waitingForRelatedEventData;
      }, [optionsWithActions]);

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
            onClick={isMenuDataAvailable ? handleMenuOpenClick : handleMenuActionClick}
            color="ghost"
            size="s"
            iconType={menuIsOpen ? 'arrowUp' : 'arrowDown'}
            iconSide="right"
            tabIndex={-1}
          >
            {menuTitle}
          </EuiButton>
          {menuIsOpen && isMenuDataAvailable && (
            <OptionList isLoading={isMenuLoading} subMenuOptions={optionsWithActions} />
          )}
        </div>
      );
    }
  )
)`
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
