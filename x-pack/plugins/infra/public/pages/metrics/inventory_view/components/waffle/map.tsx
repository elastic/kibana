/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { euiStyled } from '@kbn/kibana-react-plugin/common';
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
  bottomMargin: number;
  staticHeight: boolean;
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
  bottomMargin,
  staticHeight,
}) => {
  const sortedNodes = sortNodes(options.sort, nodes);
  const map = nodesToWaffleMap(sortedNodes);
  return (
    <AutoSizer bounds>
      {({ measureRef, bounds: { width = 0, height = 0 } }) => {
        const groupsWithLayout = applyWaffleMapLayout(map, width, height);
        return (
          <WaffleMapOuterContainer
            ref={(el: any) => measureRef(el)}
            bottomMargin={bottomMargin}
            data-test-subj="waffleMap"
            staticHeight={staticHeight}
          >
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

const WaffleMapOuterContainer = euiStyled.div<{ bottomMargin: number; staticHeight: boolean }>`
  flex: 1 0 0%;
  display: flex;
  justify-content: flex-start;
  flex-direction: column;
  overflow-x: hidden;
  overflow-y: auto;
  margin-bottom: ${(props) => props.bottomMargin}px;
  ${(props) => props.staticHeight && 'min-height: 300px;'}
`;

const WaffleMapInnerContainer = euiStyled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: center;
  align-content: flex-start;
  padding: 10px;
`;
