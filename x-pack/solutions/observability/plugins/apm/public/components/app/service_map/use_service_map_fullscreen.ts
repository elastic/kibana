/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { logicalCSS, useEuiTheme } from '@elastic/eui';
import { css as emotionCss } from '@emotion/css';
import { css } from '@emotion/react';
import {
  SERVICE_MAP_FULL_SCREEN_CLASS,
  SERVICE_MAP_RESTRICT_BODY_CLASS,
  SERVICE_MAP_WRAPPER_FULL_SCREEN_CLASS,
} from './constants';

const fullScreenBodyStyles = emotionCss`
  *:not(
      .euiFlyout,
      .${SERVICE_MAP_FULL_SCREEN_CLASS}, .${SERVICE_MAP_FULL_SCREEN_CLASS} *,
      [data-euiportal='true'],
      [data-euiportal='true'] *
    ) {
    z-index: unset;
  }
`;

export function useServiceMapFullScreen() {
  const { euiTheme } = useEuiTheme();

  const fullScreenZIndex = Number(euiTheme.levels.header) - 1;

  const restrictBodyStylesClass = useMemo(
    () =>
      emotionCss`
        ${logicalCSS('height', '100vh')}
        overflow: hidden;

        .euiHeader[data-fixed-header] {
          z-index: ${fullScreenZIndex - 1} !important;
        }

        [id^='echTooltipPortalMainTooltip'] {
          z-index: ${fullScreenZIndex + 1} !important;
        }

        .euiOverlayMask[data-relative-to-header='below'] {
          ${logicalCSS('top', '0')}
        }

        .euiFlyout {
          ${logicalCSS('top', '0 !important')}
          ${logicalCSS('height', '100%')}
        }
      `,
    [fullScreenZIndex]
  );

  const bodyClassesToToggle = useMemo(
    () => [
      fullScreenBodyStyles,
      SERVICE_MAP_RESTRICT_BODY_CLASS,
      SERVICE_MAP_WRAPPER_FULL_SCREEN_CLASS,
      restrictBodyStylesClass,
    ],
    [restrictBodyStylesClass]
  );

  const styles = useMemo(
    () => ({
      [SERVICE_MAP_FULL_SCREEN_CLASS]: css`
        z-index: ${fullScreenZIndex} !important;
        position: fixed;
        inset: 0;
        ${logicalCSS('right', 'var(--euiPushFlyoutOffsetInlineEnd, 0px)')}
        background-color: ${euiTheme.colors.backgroundBasePlain};
        display: flex;
        flex-direction: column;
        height: 100%;
      `,
    }),
    [euiTheme, fullScreenZIndex]
  );

  return {
    bodyClassesToToggle,
    styles,
  };
}

export function applyServiceMapFullScreenBodyClasses(
  isFullscreen: boolean,
  bodyClassesToToggle: string[]
) {
  if (isFullscreen) {
    document.body.classList.add(...bodyClassesToToggle);
  } else {
    document.body.classList.remove(...bodyClassesToToggle);
  }
}
