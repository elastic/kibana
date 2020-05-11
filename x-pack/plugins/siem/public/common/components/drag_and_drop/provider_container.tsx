/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import styled, { css } from 'styled-components';
import { STATEFUL_EVENT_CSS_CLASS_NAME } from '../../../timelines/components/timeline/helpers';

interface ProviderContainerProps {
  isDragging: boolean;
}

const ProviderContainerComponent = styled.div<ProviderContainerProps>`
  &,
  &::before,
  &::after {
    transition: background ${({ theme }) => theme.eui.euiAnimSpeedFast} ease,
      color ${({ theme }) => theme.eui.euiAnimSpeedFast} ease;
  }

  ${({ isDragging }) =>
    !isDragging &&
    css`
      & {
        border-radius: 2px;
        padding: 0 4px 0 8px;
        position: relative;
        z-index: ${({ theme }) => theme.eui.euiZLevel0} !important;

        &::before {
          background-image: linear-gradient(
              135deg,
              ${({ theme }) => theme.eui.euiColorMediumShade} 25%,
              transparent 25%
            ),
            linear-gradient(
              -135deg,
              ${({ theme }) => theme.eui.euiColorMediumShade} 25%,
              transparent 25%
            ),
            linear-gradient(
              135deg,
              transparent 75%,
              ${({ theme }) => theme.eui.euiColorMediumShade} 75%
            ),
            linear-gradient(
              -135deg,
              transparent 75%,
              ${({ theme }) => theme.eui.euiColorMediumShade} 75%
            );
          background-position: 0 0, 1px 0, 1px -1px, 0px 1px;
          background-size: 2px 2px;
          bottom: 2px;
          content: '';
          display: block;
          left: 2px;
          position: absolute;
          top: 2px;
          width: 4px;
        }
      }

      &:hover {
        &,
        & .euiBadge,
        & .euiBadge__text {
          cursor: move; /* Fallback for IE11 */
          cursor: grab;
        }
      }

      .${STATEFUL_EVENT_CSS_CLASS_NAME}:hover &,
      tr:hover & {
        background-color: ${({ theme }) => theme.eui.euiColorLightShade};

        &::before {
          background-image: linear-gradient(
              135deg,
              ${({ theme }) => theme.eui.euiColorDarkShade} 25%,
              transparent 25%
            ),
            linear-gradient(
              -135deg,
              ${({ theme }) => theme.eui.euiColorDarkShade} 25%,
              transparent 25%
            ),
            linear-gradient(
              135deg,
              transparent 75%,
              ${({ theme }) => theme.eui.euiColorDarkShade} 75%
            ),
            linear-gradient(
              -135deg,
              transparent 75%,
              ${({ theme }) => theme.eui.euiColorDarkShade} 75%
            );
        }
      }

      &:hover,
      &:focus,
      .${STATEFUL_EVENT_CSS_CLASS_NAME}:hover &:hover,
      .${STATEFUL_EVENT_CSS_CLASS_NAME}:focus &:focus,
      tr:hover &:hover,
      tr:hover &:focus {
        background-color: ${({ theme }) => theme.eui.euiColorPrimary};

        &,
        & a,
        & a:hover {
          color: ${({ theme }) => theme.eui.euiColorEmptyShade};
        }

        &::before {
          background-image: linear-gradient(
              135deg,
              ${({ theme }) => theme.eui.euiColorEmptyShade} 25%,
              transparent 25%
            ),
            linear-gradient(
              -135deg,
              ${({ theme }) => theme.eui.euiColorEmptyShade} 25%,
              transparent 25%
            ),
            linear-gradient(
              135deg,
              transparent 75%,
              ${({ theme }) => theme.eui.euiColorEmptyShade} 75%
            ),
            linear-gradient(
              -135deg,
              transparent 75%,
              ${({ theme }) => theme.eui.euiColorEmptyShade} 75%
            );
        }
      }
    `}

  ${({ isDragging }) =>
    isDragging &&
    css`
      & {
        z-index: 9999 !important;
      }
    `}
`;

ProviderContainerComponent.displayName = 'ProviderContainerComponent';

export const ProviderContainer = React.memo(ProviderContainerComponent);

ProviderContainer.displayName = 'ProviderContainer';
