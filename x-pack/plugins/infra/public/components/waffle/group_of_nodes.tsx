/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import styled from 'styled-components';
import { InfraWaffleMapGroupOfNodes, InfraWaffleOptions } from '../../lib/lib';
import { GroupName } from './group_name';
import { Node } from './node';

interface Props {
  onDrilldown: () => void;
  options: InfraWaffleOptions;
  group: InfraWaffleMapGroupOfNodes;
  formatter: (val: number) => string;
  isChild: boolean;
}

export const GroupOfNodes: React.SFC<Props> = ({
  group,
  options,
  formatter,
  onDrilldown,
  isChild = false,
}) => {
  const width = group.width > 200 ? group.width : 200;
  return (
    <GroupOfNodesContainer style={{ width }}>
      <GroupName group={group} onDrilldown={onDrilldown} isChild={isChild} />
      <Nodes>
        {group.nodes.map(node => (
          <Node
            key={node.id}
            options={options}
            squareSize={group.squareSize}
            node={node}
            onDrilldown={onDrilldown}
            formatter={formatter}
          />
        ))}
      </Nodes>
    </GroupOfNodesContainer>
  );
};

export const GroupOfNodesContainer = styled.div`
  margin: 0 10px;
`;

export const Nodes = styled.div`
  display: flex;
  background-color: rgba(0, 0, 0, 0.05);
  flex-wrap: wrap;
  justify-content: center;
  padding: 20px 10px 10px;
  border-radius: 4px;
  border: 1px solid ${props => props.theme.eui.euiBorderColor};
  box-shadow: 0 1px 7px rgba(0, 0, 0, 0.1);
`;
