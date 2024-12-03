/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { darken, readableColor } from 'polished';
import React, { CSSProperties } from 'react';

import { i18n } from '@kbn/i18n';

import { css } from '@emotion/react';
import { UseBooleanHandlers } from '@kbn/react-hooks';
import { useEuiTheme } from '@elastic/eui';

type NodeProps<T = HTMLDivElement> = React.DetailedHTMLProps<React.HTMLAttributes<T>, T> & {
  'data-test-subj'?: string;
};

const SquareContent = ({
  children,
  css: contentStyle,
  ...props
}: NodeProps & { color: string }) => (
  <div
    css={css`
      text-align: center;
      width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      flex: 1 0 auto;
      color: ${readableColor(props.color)};
    `}
    {...props}
  >
    {children}
  </div>
);

const NodeContainer = ({ children, ...props }: NodeProps) => (
  <div
    css={css`
      position: relative;
      cursor: pointer;
    `}
    {...props}
  >
    {children}
  </div>
);

const NodeContainerSmall = ({ children, ...props }: NodeProps & { color: string }) => (
  <div
    css={css`
      cursor: pointer;
      position: relative;
      background-color: ${darken(0.1, props.color)};
      border-radius: 3px;
      margin: 2px;
      box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.2);
    `}
    {...props}
  >
    {children}
  </div>
);
const ValueInner = ({ children, ...props }: NodeProps) => {
  const { euiTheme } = useEuiTheme();

  return (
    <div
      css={css`
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
          border: ${euiTheme.focus.width} solid ${euiTheme.focus.color};
          box-shadow: none;
        }
      `}
      tabIndex={0}
      {...props}
    >
      {children}
    </div>
  );
};
const SquareOuter = ({ children, ...props }: NodeProps & { color: string }) => (
  <div
    css={css`
      position: absolute;
      top: 4px;
      left: 4px;
      bottom: 4px;
      right: 4px;
      background-color: ${darken(0.1, props.color)};
      border-radius: 3px;
      box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.2);
    `}
    {...props}
  >
    {children}
  </div>
);
const SquareInner = ({ children, ...props }: NodeProps & { color: string }) => (
  <div
    css={css`
      position: absolute;
      top: 0;
      right: 0;
      bottom: 2px;
      left: 0;
      border-radius: 3px;
      background-color: ${props.color};
    `}
    {...props}
  >
    {children}
  </div>
);
const Label = ({ children, ...props }: NodeProps & { color: string }) => (
  <SquareContent
    css={css`
      font-size: 0.7em;
      margin-bottom: 0.7em;
    `}
    {...props}
  >
    {children}
  </SquareContent>
);
const Value = ({ children, ...props }: NodeProps & { color: string }) => (
  <SquareContent
    css={css`
      font-weight: bold;
      font-size: 0.9em;
      line-height: 1.2em;
    `}
    {...props}
  >
    {children}
  </SquareContent>
);

export const NodeSquare = ({
  squareSize,
  togglePopover,
  color,
  nodeName,
  value,
  showBorder,
}: {
  squareSize: number;
  togglePopover: UseBooleanHandlers['toggle'];
  color: string;
  nodeName: string;
  value: string;
  showBorder?: boolean;
}) => {
  const valueMode = squareSize > 70;
  const ellipsisMode = squareSize > 30;
  const nodeAriaLabel = i18n.translate('xpack.infra.node.ariaLabel', {
    defaultMessage: '{nodeName}, click to open menu',
    values: { nodeName },
  });
  const style: CSSProperties | undefined = showBorder ? { border: 'solid 4px #000' } : undefined;

  return valueMode || ellipsisMode ? (
    <NodeContainer
      data-test-subj="nodeContainer"
      style={{ width: squareSize || 0, height: squareSize || 0 }}
      onClick={togglePopover}
      onKeyPress={togglePopover}
      className="buttonContainer"
    >
      <SquareOuter color={color} style={style}>
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
                {/* eslint-disable-next-line @kbn/i18n/strings_should_be_translated_with_i18n */}
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
      style={{ width: squareSize || 0, height: squareSize || 0, ...style }}
      onClick={togglePopover}
      onKeyPress={togglePopover}
      color={color}
      tabIndex={0}
    />
  );
};
