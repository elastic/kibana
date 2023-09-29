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
import { euiThemeVars } from '@kbn/ui-theme';
import { DispatchWithOptionalAction } from '../../../../../hooks/use_boolean';

const SquareTextContentStyles = (color: string) => `
  text-align: center;
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1 0 auto;
  color: ${readableColor(color)};
`;
const styles = {
  nodeContainerSmall: (color: string) => `
    cursor: pointer;
    position: relative;
    background-color: ${darken(0.1, color)};
    border-radius: 3px;
    margin: 2px;
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.2);
  `,
  valueInner: `
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
      border: ${euiThemeVars.euiFocusRingSize} solid ${euiThemeVars.euiFocusRingColor};
      box-shadow: none;
    }
  `,
  squareOuter: (color: string) => `
    position: absolute;
    top: 4px;
    left: 4px;
    bottom: 4px;
    right: 4px;
    background-color: ${darken(0.1, color)};
    border-radius: 3px;
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.2);
  `,
  squareInner: (color: string) => `
    position: absolute;
    top: 0;
    right: 0;
    bottom: 2px;
    left: 0;
    border-radius: 3px;
    background-color: ${color};
  `,
  label: (color: string) => `
    font-size: 0.7em;
    margin-bottom: 0.7em;
    ${SquareTextContentStyles(color)}
  `,
  value: (color: string) => `
    font-weight: bold;
    font-size: 0.9em;
    line-height: 1.2em;
    ${SquareTextContentStyles(color)}
  `,
};

export const NodeSquare = ({
  squareSize,
  togglePopover,
  showToolTip,
  hideToolTip,
  color,
  nodeName,
  value,
  showBorder,
}: {
  squareSize: number;
  togglePopover: DispatchWithOptionalAction<boolean>;
  showToolTip: () => void;
  hideToolTip: () => void;
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
    <div
      css={css`
        position: relative;
        cursor: pointer;
      `}
      data-test-subj="nodeContainer"
      style={{ width: squareSize || 0, height: squareSize || 0 }}
      onClick={togglePopover}
      onKeyPress={togglePopover}
      onFocus={showToolTip}
      onMouseOver={showToolTip}
      onMouseLeave={hideToolTip}
      className="buttonContainer"
    >
      <div
        css={css`
          ${styles.squareOuter(color)}
        `}
        style={style}
      >
        <div
          css={css`
            ${styles.squareInner(color)}
          `}
        >
          {valueMode ? (
            <button
              css={css`
                ${styles.valueInner}
              `}
              aria-label={nodeAriaLabel}
            >
              <div
                css={css`
                  ${styles.label(color)}
                `}
                data-test-subj="nodeName"
              >
                {nodeName}
              </div>
              <div
                css={css`
                  ${styles.value(color)}
                `}
                data-test-subj="nodeValue"
              >
                {value}
              </div>
            </button>
          ) : (
            ellipsisMode && (
              <button
                css={css`
                  ${styles.valueInner}
                `}
                aria-label={nodeAriaLabel}
              >
                <div
                  css={css`
                    ${styles.label(color)}
                  `}
                >
                  ...
                </div>
              </button>
            )
          )}
        </div>
      </div>
    </div>
  ) : (
    <div
      css={styles.nodeContainerSmall(color)}
      data-test-subj="nodeContainer"
      style={{ width: squareSize || 0, height: squareSize || 0, ...style }}
      onClick={togglePopover}
      onKeyPress={togglePopover}
      onMouseOver={showToolTip}
      onFocus={showToolTip}
      onMouseLeave={hideToolTip}
      color={color}
    />
  );
};
