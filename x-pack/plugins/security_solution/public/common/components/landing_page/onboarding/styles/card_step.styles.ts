/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiBackgroundColor, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/css';
import { useMemo } from 'react';

export const HEIGHT_ANIMATION_DURATION = 250;

export const useCardStepStyles = () => {
  const { euiTheme } = useEuiTheme();
  const completeStepBackgroundColor = useEuiBackgroundColor('success');

  const customStyles = useMemo(
    () => ({
      stepPanelStyles: css({
        '.stepContentWrapper': {
          display: 'grid',
          gridTemplateRows: '1fr',
          transition: `grid-template-rows ${HEIGHT_ANIMATION_DURATION}ms ease-in`,
        },

        '&.step-panel-collapsed .stepContentWrapper': {
          gridTemplateRows: '0fr',
        },

        '.stepContent': {
          overflow: 'hidden',
        },
      }),
      getStepGroundStyles: ({ hasStepContent }: { hasStepContent: boolean }) =>
        css({
          cursor: hasStepContent ? 'pointer' : 'default',
          gap: euiTheme.size.base,
        }),
      stepItemStyles: css({ alignSelf: 'center' }),
      stepIconStyles: css({
        '&.step-icon': {
          borderRadius: '50%',
          width: euiTheme.size.xxxl,
          height: euiTheme.size.xxxl,
          padding: euiTheme.size.m,
          backgroundColor: euiTheme.colors.body,
        },

        '&.step-icon-done': {
          backgroundColor: completeStepBackgroundColor,
        },
      }),
      stepTitleStyles: css({
        '&.step-title': {
          paddingRight: euiTheme.size.m,
          lineHeight: euiTheme.size.xxxl,
          fontSize: `${euiTheme.base * 0.875}px`,
          fontWeight: euiTheme.font.weight.semiBold,
          verticalAlign: 'middle',
        },
      }),
      allDoneTextStyles: css({
        '&.all-done-badge': {
          backgroundColor: completeStepBackgroundColor,
          color: euiTheme.colors.successText,
        },
      }),
      toggleButtonStyles: css({
        '&.toggle-button': {
          marginLeft: `${euiTheme.base * 0.375}px`,
        },
      }),
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
