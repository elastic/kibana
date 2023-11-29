/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiShadow, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { useMemo } from 'react';

export const LEFT_CONTENT_PANEL_WIDTH = 486;
export const RIGHT_CONTENT_PANEL_WIDTH = 510;
export const RIGHT_CONTENT_HEIGHT = 270;
export const RIGHT_CONTENT_WIDTH = 480;

export const useStepContentStyles = () => {
  const { euiTheme } = useEuiTheme();
  const shadow = useEuiShadow('s');

  const stepContentGroupStyles = css`
    &.step-content-group {
      justify-content: space-between;
      margin-top: ${euiTheme.size.l};
      padding: ${euiTheme.size.l};
      transition: opacity ${euiTheme.animation.normal};
      overflow: hidden;
      border: 1px solid ${euiTheme.colors.lightShade};
      border-radius: ${euiTheme.border.radius.medium};
    }
  `;

  const leftContentStyles = css`
    &.left-panel {
      padding: 0 ${euiTheme.size.l} 0 ${euiTheme.size.s};
      width: ${LEFT_CONTENT_PANEL_WIDTH}px;
    }
  `;

  const descriptionStyles = css`
    &.step-content-description {
      margin-bottom: ${euiTheme.base * 2}px;
      margin-block-end: ${euiTheme.base * 2}px !important;
      line-height: ${euiTheme.size.l};
    }
  `;

  const rightPanelStyles = css`
    &.right-panel {
      padding: 0 6px 0 ${euiTheme.size.l};
      width: ${RIGHT_CONTENT_PANEL_WIDTH}px;
    }
  `;

  const rightPanelContentStyles = css`
    &.right-content-panel {
      height: ${RIGHT_CONTENT_HEIGHT}px;
      width: ${RIGHT_CONTENT_WIDTH}px;
      border-radius: ${euiTheme.border.radius.medium};
      overflow: hidden;
      box-shadow: ${shadow};
    }
  `;

  const customStyles = useMemo(
    () => ({
      stepContentGroupStyles,
      leftContentStyles,
      descriptionStyles,
      rightPanelStyles,
      rightPanelContentStyles,
    }),
    [
      descriptionStyles,
      leftContentStyles,
      rightPanelContentStyles,
      rightPanelStyles,
      stepContentGroupStyles,
    ]
  );

  return customStyles;
};
