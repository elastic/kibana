/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { useMemo, useContext, useCallback } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { useDispatch } from 'react-redux';
import { EuiI18nNumber } from '@elastic/eui';
import { EventStats } from '../../../common/endpoint/types';
import { useColors } from './use_colors';
import { useLinkProps } from './use_link_props';
import { ResolverAction } from '../store/actions';
import { SideEffectContext } from './side_effect_context';

/* eslint-disable react/display-name */

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
            category,
          };
        });
      }
    }, [nodeStats]);

    if (relatedEventOptions === undefined) {
      return null;
    }

    return (
      <ul className={`${className} options`} aria-describedby={nodeID}>
        {relatedEventOptions
          .sort((opta, optb) => {
            return opta.category.localeCompare(optb.category);
          })
          .map((pill) => {
            return <NodeSubmenuPill pill={pill} nodeID={nodeID} key={pill.category} />;
          })}
      </ul>
    );
  }
);

const NodeSubmenuPill = ({
  pill,
  nodeID,
}: {
  pill: { prefix: JSX.Element; category: string };
  nodeID: string;
}) => {
  const linkProps = useLinkProps({
    panelView: 'nodeEventsInCategory',
    panelParameters: { nodeID, eventCategory: pill.category },
  });
  const { pillStroke: pillBorderStroke, resolverBackground: pillFill } = useColors();
  const listStylesFromTheme = useMemo(() => {
    return {
      border: `1.5px solid ${pillBorderStroke}`,
      backgroundColor: pillFill,
    };
  }, [pillBorderStroke, pillFill]);

  const dispatch: (action: ResolverAction) => void = useDispatch();
  const { timestamp } = useContext(SideEffectContext);

  const handleOnClick = useCallback(
    (mouseEvent: React.MouseEvent<HTMLButtonElement>) => {
      linkProps.onClick(mouseEvent);
      dispatch({
        type: 'userSelectedResolverNode',
        payload: {
          nodeID,
          time: timestamp(),
        },
      });
    },
    [timestamp, linkProps, dispatch, nodeID]
  );
  return (
    <li
      className="item"
      data-test-subj="resolver:map:node-submenu-item"
      style={listStylesFromTheme}
      key={pill.category}
    >
      <button type="button" className="kbn-resetFocusState" onClick={handleOnClick}>
        {pill.prefix} {pill.category}
      </button>
    </li>
  );
};
