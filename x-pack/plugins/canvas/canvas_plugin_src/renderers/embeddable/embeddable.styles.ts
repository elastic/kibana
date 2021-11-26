/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiThemeComputed } from '@elastic/eui';
import { css } from '@emotion/react';

export const embeddableContainerStyles = css`
  width: 100%;
  height: 100%;
  cursor: auto;
`;

export const embeddableStyles = (theme: EuiThemeComputed) =>
  css`
    .embPanel {
      border: none;
      border-style: none !important;
      background: none;

      .embPanel__title {
        margin-bottom: ${theme.size.xs};
      }

      .embPanel__optionsMenuButton {
        border-radius: ${theme.border.radius.small};
      }

      .canvas-isFullscreen & {
        .embPanel__optionsMenuButton {
          opacity: 0;
        }

        &:focus .embPanel__optionsMenuButton,
        &:hover .embPanel__optionsMenuButton {
          opacity: 1;
        }
      }
    }

    .euiTable {
      background: none;
    }
  `;
