/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiToolTip } from '@elastic/eui';
import { darken, readableColor } from 'polished';
import React from 'react';
import styled from 'styled-components';
import { InfraNodeType } from '../../../server/lib/adapters/nodes';
import { InfraWaffleMapBounds, InfraWaffleMapNode, InfraWaffleMapOptions } from '../../lib/lib';
import { colorFromValue } from './lib/color_from_value';
import { NodeContextMenu } from './node_context_menu';

const initialState = {
  isPopoverOpen: false,
};

type State = Readonly<typeof initialState>;

interface Props {
  squareSize: number;
  options: InfraWaffleMapOptions;
  node: InfraWaffleMapNode;
  formatter: (val: number) => string;
  bounds: InfraWaffleMapBounds;
  nodeType: InfraNodeType;
}

export class Node extends React.PureComponent<Props, State> {
  public readonly state: State = initialState;
  public render() {
    const { nodeType, node, options, squareSize, bounds, formatter } = this.props;
    const { isPopoverOpen } = this.state;
    const { metric } = node;
    const valueMode = squareSize > 110;
    const rawValue = (metric && metric.value) || 0;
    const color = colorFromValue(options.legend, rawValue, bounds);
    const value = formatter(rawValue);
    return (
      <NodeContextMenu
        node={node}
        nodeType={nodeType}
        isPopoverOpen={isPopoverOpen}
        closePopover={this.closePopover}
        options={options}
      >
        <EuiToolTip position="top" content={`${node.name} | ${value}`}>
          <NodeContainer
            style={{ width: squareSize || 0, height: squareSize || 0 }}
            onClick={this.togglePopover}
          >
            <SquareOuter color={color}>
              <SquareInner color={color}>
                {valueMode && (
                  <ValueInner>
                    <Label color={color}>{node.name}</Label>
                    <Value color={color}>{value}</Value>
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

interface ColorProps {
  color: string;
}

const SquareOuter = styled<ColorProps, 'div'>('div')`
  position: absolute;
  top: 4px;
  left: 4px;
  bottom: 4px;
  right: 4px;
  background-color: ${props => darken(0.1, props.color)};
  border-radius: 3px;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.2);
`;

const SquareInner = styled<ColorProps, 'div'>('div')`
  cursor: pointer;
  position: absolute;
  top: 0;
  right: 0;
  bottom: 2px;
  left: 0;
  border-radius: 3px;
  background-color: ${props => props.color};
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

const Value = styled<ColorProps, 'div'>('div')`
  font-weight: bold;
  font-size: 0.9em;
  text-align: center;
  width: 100%;
  flex: 1 0 auto;
  line-height: 1.2em;
  color: ${props => readableColor(props.color)};
`;

const Label = styled<ColorProps, 'div'>('div')`
  text-overflow: ellipsis;
  font-size: 0.7em;
  margin-bottom: 0.7em;
  text-align: center;
  width: 100%;
  flex: 1 0 auto;
  white-space: nowrap;
  overflow: hidden;
  color: ${props => readableColor(props.color)};
`;
