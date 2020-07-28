/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';

import { euiStyled } from '../../../../../../../observability/public';
import { nodesToWaffleMap } from '../../lib/nodes_to_wafflemap';
import { isWaffleMapGroupWithGroups, isWaffleMapGroupWithNodes } from '../../lib/type_guards';
import { InfraWaffleMapBounds, InfraWaffleMapOptions } from '../../../../../lib/lib';
import { AutoSizer } from '../../../../../components/auto_sizer';
import { GroupOfGroups } from './group_of_groups';
import { GroupOfNodes } from './group_of_nodes';
import { applyWaffleMapLayout } from '../../lib/apply_wafflemap_layout';
import { SnapshotNode } from '../../../../../../common/http_api/snapshot_api';
import { InventoryItemType } from '../../../../../../common/inventory_models/types';
import { sortNodes } from '../../lib/sort_nodes';

interface Props {
  nodes: SnapshotNode[];
  nodeType: InventoryItemType;
  options: InfraWaffleMapOptions;
  formatter: (subject: string | number) => string;
  currentTime: number;
  onFilter: (filter: string) => void;
  bounds: InfraWaffleMapBounds;
  dataBounds: InfraWaffleMapBounds;
}

export const Map: React.FC<Props> = ({
  nodes,
  options,
  currentTime,
  onFilter,
  formatter,
  bounds,
  nodeType,
  dataBounds,
}) => {
  const sortedNodes = sortNodes(options.sort, nodes);
  const map = nodesToWaffleMap(sortedNodes);
  return (
    <AutoSizer content>
      {({ measureRef, content: { width = 0, height = 0 } }) => {
        const groupsWithLayout = applyWaffleMapLayout(map, width, height);
        return (
          <WaffleMapOuterContainer ref={(el: any) => measureRef(el)} data-test-subj="waffleMap">
            <WaffleMapInnerContainer>
              {groupsWithLayout.map((group) => {
                if (isWaffleMapGroupWithGroups(group)) {
                  return (
                    <GroupOfGroups
                      onDrilldown={onFilter}
                      key={group.id}
                      options={options}
                      group={group}
                      formatter={formatter}
                      bounds={bounds}
                      nodeType={nodeType}
                      currentTime={currentTime}
                    />
                  );
                }
                if (isWaffleMapGroupWithNodes(group)) {
                  return (
                    <GroupOfNodes
                      key={group.id}
                      options={options}
                      group={group}
                      onDrilldown={onFilter}
                      formatter={formatter}
                      isChild={false}
                      bounds={bounds}
                      nodeType={nodeType}
                      currentTime={currentTime}
                    />
                  );
                }
              })}
            </WaffleMapInnerContainer>
          </WaffleMapOuterContainer>
        );
      }}
    </AutoSizer>
  );
};

const WaffleMapOuterContainer = euiStyled.div`
  flex: 1 0 0%;
  display: flex;
  justify-content: flex-start;
  flex-direction: column;
  overflow-x: hidden;
  overflow-y: auto;
`;

const WaffleMapInnerContainer = euiStyled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: center;
  align-content: flex-start;
  padding: 10px;
`;
