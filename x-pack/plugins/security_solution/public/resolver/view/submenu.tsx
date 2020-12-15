/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import { FormattedMessage } from 'react-intl';
import { EuiI18nNumber } from '@elastic/eui';
import { EventStats } from '../../../common/endpoint/types';
import { useRelatedEventByCategoryNavigation } from './use_related_event_by_category_navigation';
import { useColors } from './use_colors';

/**
 * Until browser support accomodates the `notation="compact"` feature of Intl.NumberFormat...
 * exported for testing
 * @param num The number to format
 * @returns [mantissa ("12" in "12k+"), Scalar of compact notation (k,M,B,T), remainder indicator ("+" in "12k+")]
 */
export function compactNotationParts(
  num: number
): [mantissa: number, compactNotation: string, remainderIndicator: string] {
  if (!Number.isFinite(num)) {
    return [num, '', ''];
  }

  // "scale" here will be a term indicating how many thousands there are in the number
  // e.g. 1001 will be 1000, 1000002 will be 1000000, etc.
  const scale = Math.pow(10, 3 * Math.min(Math.floor(Math.floor(Math.log10(num)) / 3), 4));

  const compactPrefixTranslations = {
    compactThousands: i18n.translate('xpack.securitySolution.endpoint.resolver.compactThousands', {
      defaultMessage: 'k',
    }),
    compactMillions: i18n.translate('xpack.securitySolution.endpoint.resolver.compactMillions', {
      defaultMessage: 'M',
    }),

    compactBillions: i18n.translate('xpack.securitySolution.endpoint.resolver.compactBillions', {
      defaultMessage: 'B',
    }),

    compactTrillions: i18n.translate('xpack.securitySolution.endpoint.resolver.compactTrillions', {
      defaultMessage: 'T',
    }),
  };
  const prefixMap: Map<number, string> = new Map([
    [1, ''],
    [1000, compactPrefixTranslations.compactThousands],
    [1000000, compactPrefixTranslations.compactMillions],
    [1000000000, compactPrefixTranslations.compactBillions],
    [1000000000000, compactPrefixTranslations.compactTrillions],
  ]);
  const hasRemainder = i18n.translate('xpack.securitySolution.endpoint.resolver.compactOverflow', {
    defaultMessage: '+',
  });
  const prefix = prefixMap.get(scale) ?? '';
  return [Math.floor(num / scale), prefix, (num / scale) % 1 > Number.EPSILON ? hasRemainder : ''];
}

/**
 * A Submenu that displays a collection of "pills" for each related event
 * category it has events for.
 */
export const NodeSubMenuComponents = React.memo(
  ({
    className,
    nodeID,
    nodeStats,
  }: {
    className?: string;
    // eslint-disable-next-line react/no-unused-prop-types
    buttonFill: string;
    /**
     * Receive the projection matrix, so we can see when the camera position changed, so we can force the submenu to reposition itself.
     */
    nodeID: string;
    nodeStats: EventStats | undefined;
  }) => {
    // The last projection matrix that was used to position the popover
    const relatedEventCallbacks = useRelatedEventByCategoryNavigation({
      nodeID,
      categories: nodeStats?.byCategory,
    });
    const relatedEventOptions = useMemo(() => {
      if (nodeStats === undefined) {
        return [];
      } else {
        return Object.entries(nodeStats.byCategory).map(([category, total]) => {
          const [mantissa, scale, hasRemainder] = compactNotationParts(total || 0);
          const prefix = (
            <FormattedMessage
              id="xpack.securitySolution.endpoint.resolver.node.pillNumber"
              description=""
              defaultMessage="{mantissa}{scale}{hasRemainder}"
              values={{ mantissa: <EuiI18nNumber value={mantissa} />, scale, hasRemainder }}
            />
          );
          return {
            prefix,
            optionTitle: category,
            action: () => relatedEventCallbacks(category),
          };
        });
      }
    }, [nodeStats, relatedEventCallbacks]);

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
