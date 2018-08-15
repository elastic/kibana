/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiToolTip } from '@elastic/eui';
import { darken } from 'polished';
import React from 'react';
import styled from 'styled-components';
import { InfraOptions, InfraWaffleMapNode } from '../../lib/lib';
import { NodeContextMenu } from './node_context_menu';

const initialState = {
  isPopoverOpen: false,
};

type State = Readonly<typeof initialState>;

interface Props {
  onDrilldown: () => void;
  squareSize: number;
  options: InfraOptions;
  node: InfraWaffleMapNode;
  formatter: (val: number) => string;
}

export class Node extends React.PureComponent<Props, State> {
  public readonly state: State = initialState;
  public render() {
    const { node, formatter, options, squareSize } = this.props;
    const { isPopoverOpen } = this.state;
    const metric = node.metrics.find(m => m.name === 'count');
    const valueMode = squareSize > 75;
    const label = 'Count';
    const value = metric != null ? formatter(metric.value) : 'n/a';

    return (
      <NodeContextMenu
        node={node}
        isPopoverOpen={isPopoverOpen}
        closePopover={this.closePopover}
        options={options}
      >
        <EuiToolTip position="top" content={`${node.name} | ${value}`}>
          <NodeContainer
            style={{ width: squareSize, height: squareSize }}
            onClick={this.togglePopover}
          >
            <SquareOuter>
              <SquareInner>
                {valueMode && (
                  <ValueInner>
                    <Label>{label}</Label>
                    <Value>{value}</Value>
                  </ValueInner>
                )}
              </SquareInner>
            </SquareOuter>
          </NodeContainer>
        </EuiToolTip>
      </NodeContextMenu>
    );
  }

  private togglePopover = () => {
    this.setState(prevState => ({ isPopoverOpen: !prevState.isPopoverOpen }));
  };

  private closePopover = () => {
    this.setState({ isPopoverOpen: false });
  };
}

const NodeContainer = styled.div`
  position: relative;
`;

const SquareOuter = styled.div`
  position: absolute;
  top: 4px;
  left: 4px;
  bottom: 4px;
  right: 4px;
  background-color: ${props => darken(0.1, props.theme.eui.euiColorVis0)};
  border-radius: 3px;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.2);
`;

const SquareInner = styled.div`
  cursor: pointer;
  position: absolute;
  top: 0;
  right: 0;
  bottom: 2px;
  left: 0;
  border-radius: 3px;
  background-color: ${props => props.theme.eui.euiColorVis0};
`;

const ValueInner = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  line-height: 1.2em;
  align-items: center;
  align-content: center;
  padding: 1em;
  overflow: hidden;
  flex-wrap: wrap;
`;

const Value = styled.div`
  font-weight: bold;
  font-size: 1.5em;
  text-align: center;
  width: 100%;
  flex: 1 0 auto;
  line-height: 1.2em;
`;

const Label = styled.div`
  text-overflow: ellipsis;
  font-size: 0.7em;
  margin-bottom: 0.7em;
  text-align: center;
  width: 100%;
  flex: 1 0 auto;
  white-space: nowrap;
  overflow: hidden;
`;
