/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/css';
import { useEuiTheme, euiAnimFadeIn, transparentize, euiBackgroundColor } from '@elastic/eui';

export const usePaneStyles = () => {
  const EuiTheme = useEuiTheme();
  const { euiTheme } = EuiTheme;
  return css`
    // euiOverlayMask styles
    position: fixed;
    top: var(--euiFixedHeadersOffset, 0);
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding-bottom: 10vh;
    animation: ${euiAnimFadeIn} ${euiTheme.animation.fast} ease-in;
    background: ${transparentize(euiTheme.colors.ink, 0.5)};
    z-index: ${euiTheme.levels.flyout};

    &.timeline-wrapper--hidden {
      display: none;
    }

    .timeline-flyout {
      min-width: 150px;
      height: inherit;
      position: fixed;
      top: var(--euiFixedHeadersOffset, 0);
      right: 0;
      bottom: 0;
      left: 0;
      background: ${euiBackgroundColor(EuiTheme, 'plain')};
    }

    &:not(.timeline-wrapper--full-screen) .timeline-flyout {
      margin: ${euiTheme.size.m};
      border-radius: ${euiTheme.border.radius.medium};
      padding: 0 ${euiTheme.size.s};
    }
  `;
};
