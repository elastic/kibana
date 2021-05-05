/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { euiStyled } from '../../../../../../../../../src/plugins/kibana_react/common';
import {
  InfraWaffleMapBounds,
  InfraWaffleMapGroupOfNodes,
  InfraWaffleMapOptions,
} from '../../../../../lib/lib';
import { GroupName } from './group_name';
import { Node } from './node';
import { InventoryItemType } from '../../../../../../common/inventory_models/types';

interface Props {
  onDrilldown: (filter: string) => void;
  options: InfraWaffleMapOptions;
  group: InfraWaffleMapGroupOfNodes;
  formatter: (val: number) => string;
  isChild: boolean;
  bounds: InfraWaffleMapBounds;
  nodeType: InventoryItemType;
  currentTime: number;
}

export const GroupOfNodes: React.FC<Props> = ({
  group,
  options,
  formatter,
  onDrilldown,
  isChild = false,
  bounds,
  nodeType,
  currentTime,
}) => {
  const width = group.width > 200 ? group.width : 200;
  return (
    <GroupOfNodesContainer style={{ width }}>
      <GroupName group={group} onDrilldown={onDrilldown} isChild={isChild} options={options} />
      <Nodes>
        {group.width
          ? group.nodes.map((node) => (
              <Node
                key={`${node.pathId}:${node.name}`}
                options={options}
                squareSize={group.squareSize}
                node={node}
                formatter={formatter}
                bounds={bounds}
                nodeType={nodeType}
                currentTime={currentTime}
              />
            ))
          : null}
      </Nodes>
    </GroupOfNodesContainer>
  );
};

const GroupOfNodesContainer = euiStyled.div`
  margin: 0 10px;
`;

const Nodes = euiStyled.div`
  display: flex;
  background-color: rgba(0, 0, 0, 0.05);
  flex-wrap: wrap;
  justify-content: center;
  padding: 20px 10px 10px;
  border-radius: 4px;
  border: 1px solid ${(props) => props.theme.eui.euiBorderColor};
  box-shadow: 0 1px 7px rgba(0, 0, 0, 0.1);
`;
