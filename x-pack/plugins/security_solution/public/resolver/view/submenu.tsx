/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import { EuiI18nNumber, ButtonColor } from '@elastic/eui';
import styled from 'styled-components';
import { ResolverNodeStats } from '../../../common/endpoint/types';
import { useRelatedEventByCategoryNavigation } from './use_related_event_by_category_navigation';
import { useResolverTheme } from './assets';

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
 * A Submenu to be displayed in one of two forms:
 *   1) Provided a collection of `optionsWithActions`: it will call `menuAction` then - if and when menuData becomes available - display each item with an optional prefix and call the supplied action for the options when that option is clicked.
 *   2) Provided `optionsWithActions` is undefined, it will call the supplied `menuAction` when its host button is clicked.
 */
const NodeSubMenuComponents = React.memo(
  ({
    className,
    nodeID,
    relatedEventStats,
  }: {
    className?: string;
    // eslint-disable-next-line react/no-unused-prop-types
    buttonFill: string;
    /**
     * Receive the projection matrix, so we can see when the camera position changed, so we can force the submenu to reposition itself.
     */
    nodeID: string;
    relatedEventStats: ResolverNodeStats | undefined;
  }) => {
    // The last projection matrix that was used to position the popover
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

    const {
      colorMap: { pillStroke: pillBorderStroke, resolverBackground: pillFill },
    } = useResolverTheme();
    const listStylesFromTheme = useMemo(() => {
      return {
        border: `1.5px solid ${pillBorderStroke}`,
        backgroundColor: pillFill,
      };
    }, [pillBorderStroke, pillFill]);

    if (relatedEventOptions === undefined) {
      return null;
    }

    return (
      <ul className={`${className} options`} aria-describedby={nodeID}>
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
`;
