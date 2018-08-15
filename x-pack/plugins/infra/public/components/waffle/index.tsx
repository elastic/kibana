/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import styled from 'styled-components';
import { AutoSizer } from '../auto_sizer';
import { GroupOfGroups } from './group_of_groups';
import { GroupOfNodes } from './group_of_nodes';

import {
  isWaffleMapGroupWithGroups,
  isWaffleMapGroupWithNodes,
} from '../../containers/map/type_guards';
import { InfraOptions, InfraWaffleData, InfraWaffleMapGroup } from '../../lib/lib';
import { applyWaffleMapLayout } from './lib/apply_wafflemap_layout';

interface Props {
  options: InfraOptions;
  map: InfraWaffleData;
}

export class Waffle extends React.Component<Props, {}> {
  public render() {
    return (
      <AutoSizer content>
        {({ measureRef, content: { width = 0, height = 0 } }) => {
          const { map } = this.props;
          const groupsWithLayout = applyWaffleMapLayout(map, width, height);
          return (
            <WaffleMapOuterContiner innerRef={(el: any) => measureRef(el)}>
              <WaffleMapInnerContainer>
                {groupsWithLayout.map(this.renderGroup)}
              </WaffleMapInnerContainer>
            </WaffleMapOuterContiner>
          );
        }}
      </AutoSizer>
    );
  }

  // TODO: Change this to a real implimentation using the tickFormatter from the prototype as an example.
  private formatter(val: string | number) {
    return String(val);
  }

  private handleDrilldown() {
    return;
  }

  private renderGroup = (group: InfraWaffleMapGroup) => {
    if (isWaffleMapGroupWithGroups(group)) {
      return (
        <GroupOfGroups
          onDrilldown={this.handleDrilldown}
          key={group.id}
          options={this.props.options}
          group={group}
          formatter={this.formatter}
        />
      );
    }
    if (isWaffleMapGroupWithNodes(group)) {
      return (
        <GroupOfNodes
          key={group.id}
          options={this.props.options}
          group={group}
          onDrilldown={this.handleDrilldown}
          formatter={this.formatter}
          isChild={false}
        />
      );
    }
  };
}

const WaffleMapOuterContiner = styled.div`
  flex: 1 0 0;
  display: flex;
  justify-content: center;
  flex-direction: column;
  overflow-x: hidden;
  overflow-y: auto;
`;

const WaffleMapInnerContainer = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: center;
  align-content: flex-start;
  padding: 10px;
`;
