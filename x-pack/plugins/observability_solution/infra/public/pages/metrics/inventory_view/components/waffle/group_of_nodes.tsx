/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import { isEqual } from 'lodash';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import { InventoryItemType } from '@kbn/metrics-data-access-plugin/common';
import {
  InfraWaffleMapBounds,
  InfraWaffleMapGroupOfNodes,
  InfraWaffleMapOptions,
} from '../../../../../lib/lib';
import { GroupName } from './group_name';
import { Node } from './node';
import { useAssetDetailsFlyoutState } from '../../hooks/use_asset_details_flyout_url_state';

interface Props {
  onDrilldown: (filter: string) => void;
  options: InfraWaffleMapOptions;
  group: InfraWaffleMapGroupOfNodes;
  formatter: (val: number) => string;
  isChild: boolean;
  bounds: InfraWaffleMapBounds;
  nodeType: InventoryItemType;
  currentTime: number;
  detailsItemId: string | null;
}

// custom comparison function for rendering the nodes to prevent unncessary rerendering
const isEqualGroupOfNodes = (prevProps: Props, nextProps: Props) => {
  const { bounds: prevBounds, group: prevGroup, ...prevPropsToCompare } = prevProps;
  const { bounds: nextBounds, group: nextGroup, ...nextPropsToCompare } = nextProps;
  const { nodes: prevNodes, ...prevGroupToCompare } = prevProps.group;
  const { nodes: nextNodes, ...nextGroupToCompare } = nextProps.group;
  return (
    isEqual(prevPropsToCompare, nextPropsToCompare) &&
    isEqual(prevGroupToCompare, nextGroupToCompare)
  );
};

export const GroupOfNodes = React.memo<Props>(
  ({
    group,
    options,
    formatter,
    onDrilldown,
    isChild = false,
    bounds,
    nodeType,
    currentTime,
    detailsItemId,
  }) => {
    const width = group.width > 200 ? group.width : 200;
    const [_, setFlyoutUrlState] = useAssetDetailsFlyoutState();

    return (
      <GroupOfNodesContainer style={{ width }}>
        <GroupName group={group} onDrilldown={onDrilldown} isChild={isChild} options={options} />
        <Nodes>
          {group.width ? (
            group.nodes.map((node) => (
              <Node
                key={`${node.pathId}:${node.name}`}
                options={options}
                squareSize={group.squareSize}
                node={node}
                formatter={formatter}
                bounds={bounds}
                nodeType={nodeType}
                currentTime={currentTime}
                detailsItemId={detailsItemId}
                setFlyoutUrlState={setFlyoutUrlState}
              />
            ))
          ) : (
            <EuiLoadingSpinner size="xl" />
          )}
        </Nodes>
      </GroupOfNodesContainer>
    );
  },
  isEqualGroupOfNodes
);

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
