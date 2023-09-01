/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useContext, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import type { EventStats } from '../../../common/endpoint/types';
import { useColors } from './use_colors';
import { useLinkProps } from './use_link_props';
import { SideEffectContext } from './side_effect_context';
import { FormattedCount } from '../../common/components/formatted_number';
import { userSelectedResolverNode } from '../store/actions';

/**
 * A Submenu that displays a collection of "pills" for each related event
 * category it has events for.
 */
// eslint-disable-next-line react/display-name
export const NodeSubMenuComponents = React.memo(
  ({
    id,
    className,
    nodeID,
    nodeStats,
  }: {
    id: string;
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
          const prefix = <FormattedCount count={total || 0} />;
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
            return <NodeSubmenuPill id={id} pill={pill} nodeID={nodeID} key={pill.category} />;
          })}
      </ul>
    );
  }
);

const NodeSubmenuPill = ({
  id,
  pill,
  nodeID,
}: {
  id: string;
  pill: { prefix: JSX.Element; category: string };
  nodeID: string;
}) => {
  const linkProps = useLinkProps(id, {
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

  const dispatch = useDispatch();
  const { timestamp } = useContext(SideEffectContext);

  const handleOnClick = useCallback(
    (mouseEvent: React.MouseEvent<HTMLButtonElement>) => {
      linkProps.onClick(mouseEvent);
      dispatch(
        userSelectedResolverNode({
          id,
          nodeID,
          time: timestamp(),
        })
      );
    },
    [timestamp, linkProps, dispatch, nodeID, id]
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
