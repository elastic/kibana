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
    background: ${transparentize(euiTheme.colors.ink, 0.5)};
    z-index: ${(euiTheme.levels.flyout as number) +
    1}; // this z-index needs to be between the eventFlyout (set at 1000) and the timelineFlyout (set at 1002)

    ${euiCanAnimate} {
      animation: ${euiAnimFadeIn} ${euiTheme.animation.fast} ease-in;
    }

    &.timeline-portal-overlay-mask--hidden {
      display: none;
    }

    .timeline-container {
      min-width: 150px;
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
    }

    &:not(.timeline-portal-overlay-mask--full-screen) .timeline-container {
      margin: ${euiTheme.size.m};
      border-radius: ${euiTheme.border.radius.medium};

      .timeline-template-badge {
        border-radius: ${euiTheme.border.radius.medium} ${euiTheme.border.radius.medium} 0 0; // top corners only
      }
    }
  `;
};

export const OverflowHiddenGlobalStyles = () => {
  return <Global styles={'body { overflow: hidden }'} />;
};
