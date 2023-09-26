/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { darken, readableColor } from 'polished';
import React, { CSSProperties } from 'react';

import { i18n } from '@kbn/i18n';

import { euiStyled } from '@kbn/kibana-react-plugin/common';
import { DispatchWithOptionalAction } from '../../../../../hooks/use_boolean';

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

export const NodeSquare = ({
  squareSize,
  togglePopover,
  showToolTip,
  hideToolTip,
  color,
  nodeName,
  value,
  nodeBorder,
}: {
  squareSize: number;
  togglePopover: DispatchWithOptionalAction<boolean>;
  showToolTip: () => void;
  hideToolTip: () => void;
  color: string;
  nodeName: string;
  value: string;
  nodeBorder?: CSSProperties;
}) => {
  const valueMode = squareSize > 70;
  const ellipsisMode = squareSize > 30;
  const nodeAriaLabel = i18n.translate('xpack.infra.node.ariaLabel', {
    defaultMessage: '{nodeName}, click to open menu',
    values: { nodeName },
  });

  return valueMode || ellipsisMode ? (
    <NodeContainer
      data-test-subj="nodeContainer"
      style={{ width: squareSize || 0, height: squareSize || 0 }}
      onClick={togglePopover}
      onMouseOver={showToolTip}
      onMouseLeave={hideToolTip}
      className="buttonContainer"
    >
      <SquareOuter color={color} style={nodeBorder}>
        <SquareInner color={color}>
          {valueMode ? (
            <ValueInner aria-label={nodeAriaLabel}>
              <Label data-test-subj="nodeName" color={color}>
                {nodeName}
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
  ) : (
    <NodeContainerSmall
      data-test-subj="nodeContainer"
      style={{ width: squareSize || 0, height: squareSize || 0, ...nodeBorder }}
      onClick={togglePopover}
      onMouseOver={showToolTip}
      onMouseLeave={hideToolTip}
      color={color}
    />
  );
};
