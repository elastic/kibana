/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { darken, readableColor } from 'polished';
import React from 'react';

import { i18n } from '@kbn/i18n';

import { first } from 'lodash';
import { EuiPopover, EuiToolTip } from '@elastic/eui';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import {
  InfraWaffleMapBounds,
  InfraWaffleMapNode,
  InfraWaffleMapOptions,
} from '../../../../../lib/lib';
import { ConditionalToolTip } from './conditional_tooltip';
import { colorFromValue } from '../../lib/color_from_value';
import { InventoryItemType } from '../../../../../../common/inventory_models/types';
import { NodeContextPopover } from '../node_details/overlay';

import { NodeContextMenu } from './node_context_menu';
import { AlertFlyout } from '../../../../../alerting/inventory/components/alert_flyout';
import { findInventoryFields } from '../../../../../../common/inventory_models';

const initialState = {
  isPopoverOpen: false,
  isOverlayOpen: false,
  isAlertFlyoutVisible: false,
  isToolTipOpen: false,
};

type State = Readonly<typeof initialState>;

interface Props {
  squareSize: number;
  options: InfraWaffleMapOptions;
  node: InfraWaffleMapNode;
  formatter: (val: number) => string;
  bounds: InfraWaffleMapBounds;
  nodeType: InventoryItemType;
  currentTime: number;
}

export class Node extends React.PureComponent<Props, State> {
  public readonly state: State = initialState;
  public render() {
    const { nodeType, node, options, squareSize, bounds, formatter, currentTime } = this.props;
    const { isPopoverOpen, isAlertFlyoutVisible, isToolTipOpen } = this.state;
    const metric = first(node.metrics);
    const valueMode = squareSize > 70;
    const ellipsisMode = squareSize > 30;
    const rawValue = (metric && metric.value) || 0;
    const color = colorFromValue(options.legend, rawValue, bounds);
    const value = formatter(rawValue);
    const nodeAriaLabel = i18n.translate('xpack.infra.node.ariaLabel', {
      defaultMessage: '{nodeName}, click to open menu',
      values: { nodeName: node.name },
    });

    const nodeBorder = this.state.isOverlayOpen ? { border: 'solid 4px #000' } : undefined;

    const bigSquare = (
      <NodeContainer
        data-test-subj="nodeContainer"
        style={{ width: squareSize || 0, height: squareSize || 0 }}
        onClick={this.togglePopover}
        onMouseOver={this.showToolTip}
        onMouseLeave={this.hideToolTip}
        className="buttonContainer"
      >
        <SquareOuter color={color} style={nodeBorder}>
          <SquareInner color={color}>
            {valueMode ? (
              <ValueInner aria-label={nodeAriaLabel}>
                <Label data-test-subj="nodeName" color={color}>
                  {node.name}
                </Label>
                <Value data-test-subj="nodeValue" color={color}>
                  {value}
                </Value>
              </ValueInner>
            ) : (
              ellipsisMode && (
                <ValueInner aria-label={nodeAriaLabel}>
                  <Label color={color}>...</Label>
                </ValueInner>
              )
            )}
          </SquareInner>
        </SquareOuter>
      </NodeContainer>
    );

    const smallSquare = (
      <NodeContainerSmall
        data-test-subj="nodeContainer"
        style={{ width: squareSize || 0, height: squareSize || 0, ...nodeBorder }}
        onClick={this.togglePopover}
        onMouseOver={this.showToolTip}
        onMouseLeave={this.hideToolTip}
        color={color}
      />
    );

    const nodeSquare = valueMode || ellipsisMode ? bigSquare : smallSquare;

    return (
      <>
        {isPopoverOpen ? (
          <EuiPopover
            button={nodeSquare}
            isOpen={isPopoverOpen}
            closePopover={this.closePopover}
            anchorPosition="downCenter"
            style={{ height: squareSize }}
          >
            <NodeContextMenu
              node={node}
              nodeType={nodeType}
              options={options}
              currentTime={currentTime}
            />
          </EuiPopover>
        ) : isToolTipOpen ? (
          <EuiToolTip
            delay="regular"
            position="right"
            content={
              <ConditionalToolTip currentTime={currentTime} node={node} nodeType={nodeType} />
            }
          >
            {nodeSquare}
          </EuiToolTip>
        ) : (
          nodeSquare
        )}

        {this.state.isOverlayOpen && (
          <NodeContextPopover
            openAlertFlyout={this.openAlertFlyout}
            node={node}
            nodeType={nodeType}
            isOpen={this.state.isOverlayOpen}
            options={options}
            currentTime={currentTime}
            onClose={this.toggleNewOverlay}
          />
        )}

        {isAlertFlyoutVisible && (
          <AlertFlyout
            filter={`${findInventoryFields(nodeType).id}: "${node.id}"`}
            options={options}
            nodeType={nodeType}
            setVisible={this.setAlertFlyoutVisible}
            visible={isAlertFlyoutVisible}
          />
        )}
      </>
    );
  }

  private openAlertFlyout = () => {
    this.setState({
      isOverlayOpen: false,
      isAlertFlyoutVisible: true,
    });
  };

  private setAlertFlyoutVisible = (isOpen: boolean) => {
    this.setState({
      isAlertFlyoutVisible: isOpen,
    });
  };

  private togglePopover = () => {
    const { nodeType } = this.props;
    if (nodeType === 'host') {
      this.toggleNewOverlay();
    } else {
      this.setState((prevState) => ({ isPopoverOpen: !prevState.isPopoverOpen }));
    }
  };

  private toggleNewOverlay = () => {
    this.setState((prevState) => ({
      isPopoverOpen: !prevState.isOverlayOpen === true ? false : prevState.isPopoverOpen,
      isOverlayOpen: !prevState.isOverlayOpen,
    }));
  };

  private closePopover = () => {
    if (this.state.isPopoverOpen) {
      this.setState({ isPopoverOpen: false });
    }
  };
  private showToolTip = () => {
    this.setState({ isToolTipOpen: true });
  };
  private hideToolTip = () => {
    this.setState({ isToolTipOpen: false });
  };
}

const NodeContainer = euiStyled.div`
  position: relative;
  cursor: pointer;
`;
const NodeContainerSmall = euiStyled.div<ColorProps>`
  cursor: pointer;
  position: relative;
  background-color: ${(props) => darken(0.1, props.color)};
  border-radius: 3px;
  margin: 2px;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.2);
`;

interface ColorProps {
  color: string;
}

const SquareOuter = euiStyled.div<ColorProps>`
  position: absolute;
  top: 4px;
  left: 4px;
  bottom: 4px;
  right: 4px;
  background-color: ${(props) => darken(0.1, props.color)};
  border-radius: 3px;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.2);
`;

const SquareInner = euiStyled.div<ColorProps>`
  position: absolute;
  top: 0;
  right: 0;
  bottom: 2px;
  left: 0;
  border-radius: 3px;
  background-color: ${(props) => props.color};
`;

const ValueInner = euiStyled.button`
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
  width: 100%;
  border: none;
  &:focus {
    outline: none !important;
    border: ${(params) => params.theme?.eui.euiFocusRingSize} solid
      ${(params) => params.theme?.eui.euiFocusRingColor};
    box-shadow: none;
  }
`;

const SquareTextContent = euiStyled.div<ColorProps>`
  text-align: center;
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1 0 auto;
  color: ${(props) => readableColor(props.color)};
`;

const Value = euiStyled(SquareTextContent)`
  font-weight: bold;
  font-size: 0.9em;
  line-height: 1.2em;
`;

const Label = euiStyled(SquareTextContent)`
  font-size: 0.7em;
  margin-bottom: 0.7em;
`;
