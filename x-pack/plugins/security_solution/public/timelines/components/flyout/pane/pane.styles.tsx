/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { css } from '@emotion/css';
import { Global } from '@emotion/react';
import {
  useEuiTheme,
  euiAnimFadeIn,
  transparentize,
  euiBackgroundColor,
  euiCanAnimate,
  euiAnimSlideInUp,
} from '@elastic/eui';

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
    background: ${transparentize(euiTheme.colors.ink, 0.5)};
    z-index: ${euiTheme.levels.flyout};

    ${euiCanAnimate} {
      animation: ${euiAnimFadeIn} ${euiTheme.animation.fast} ease-in;
    }

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
      ${euiCanAnimate} {
        animation: ${euiAnimSlideInUp(euiTheme.size.xxl)} ${euiTheme.animation.normal}
          cubic-bezier(0.39, 0.575, 0.565, 1);
      }

      .timeline-body {
        height: 100%;
        display: flex;
        flex-direction: column;
      }
    }

    &:not(.timeline-wrapper--full-screen) .timeline-flyout {
      margin: ${euiTheme.size.m};
      border-radius: ${euiTheme.border.radius.medium};

      .timeline-template-badge {
        border-radius: ${euiTheme.border.radius.medium} ${euiTheme.border.radius.medium} 0 0; // top corners only
      }
      .timeline-body {
        padding: 0 ${euiTheme.size.s};
      }
    }
  `;
};

export const OverflowHiddenGlobalStyles = () => {
  return <Global styles={'body { overflow: hidden }'} />;
};
