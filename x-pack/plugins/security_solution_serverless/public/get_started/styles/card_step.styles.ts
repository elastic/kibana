/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiBackgroundColor, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { useMemo } from 'react';

export const HEIGHT_ANIMATION_DURATION = 250;

export const useCardStepStyles = () => {
  const { euiTheme } = useEuiTheme();
  const completeStepBackgroundColor = useEuiBackgroundColor('success');

  const customStyles = useMemo(
    () => ({
      stepPanelStyles: css`
        .stepContentWrapper {
          display: grid;
          grid-template-rows: 1fr;
          transition: grid-template-rows ${HEIGHT_ANIMATION_DURATION}ms ease-in;
        }

        &.step-panel-collapsed .stepContentWrapper {
          grid-template-rows: 0fr;
        }

        .stepContent {
          overflow: hidden;
        }
      `,
      getStepGroundStyles: ({ hasStepContent }: { hasStepContent: boolean }) => css`
        cursor: ${hasStepContent ? 'pointer' : 'default'};
        gap: ${euiTheme.size.base};
      `,
      stepItemStyles: css`
        align-self: center;
      `,
      stepIconStyles: css`
        &.step-icon {
          border-radius: 50%;
          width: ${euiTheme.size.xxxl};
          height: ${euiTheme.size.xxxl};
          padding: ${euiTheme.size.m};
          background-color: ${euiTheme.colors.body};
        }

        &.step-icon-done {
          background-color: ${completeStepBackgroundColor};
        }
      `,
      stepTitleStyles: css`
        &.step-title {
          padding-right: ${euiTheme.size.m};
          line-height: ${euiTheme.size.xxxl};
          font-size: ${euiTheme.base * 0.875}px;
          font-weight: ${euiTheme.font.weight.semiBold};
          vertical-align: middle;
        }
      `,
      allDoneTextStyles: css`
        &.all-done-badge {
          background-color: ${completeStepBackgroundColor};
          color: ${euiTheme.colors.successText};
        }
      `,
      toggleButtonStyles: css`
        &.toggle-button {
          margin-left: ${euiTheme.base * 0.375}px;
        }
      `,
    }),
    [
      completeStepBackgroundColor,
      euiTheme.base,
      euiTheme.colors.body,
      euiTheme.colors.successText,
      euiTheme.font.weight.semiBold,
      euiTheme.size.base,
      euiTheme.size.m,
      euiTheme.size.xxxl,
    ]
  );

  return customStyles;
};
