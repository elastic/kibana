/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import { EuiI18nNumber } from '@elastic/eui';
import { ResolverNodeStats } from '../../../common/endpoint/types';
import { useRelatedEventByCategoryNavigation } from './use_related_event_by_category_navigation';
import { useColors } from './use_colors';

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
  
  /**
    This can be achieved in an easier way by using `notation="compact"` on
    FormattedNumber in the future, but it does not work at present (10/2020)
*/
function compactNotation(num) {
    if(!Number.isFinite(num)){
        return num;
    }
    let scale = 1;
    while (scale < 1e12 && num / (scale * 1000) >= 1) {
        scale *= 1000;
    }
    const prefixes = {
        '1': '',
        '1000': 'k',
        '1000000': 'M',
        '1000000000': 'B',
        '1000000000000': 'T',
    }
    return [prefixes[`${scale}`], Math.floor(num / scale), ((num / scale) % 1) > Number.EPSILON]
}

export type ResolverSubmenuOptionList = ResolverSubmenuOption[] | string;

/**
 * A Submenu that displays a collection of "pills" for each related event
 * category it has events for.
 */
export const NodeSubMenuComponents = React.memo(
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

    const { pillStroke: pillBorderStroke, resolverBackground: pillFill } = useColors();
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
                key={opt.optionTitle}
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
