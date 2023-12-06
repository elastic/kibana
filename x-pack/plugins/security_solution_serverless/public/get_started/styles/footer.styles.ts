/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { useMemo } from 'react';

export const useFooterStyles = () => {
  const { euiTheme } = useEuiTheme();

  const footerStyles = useMemo(
    () => ({
      wrapperStyle: css`
        padding: ${euiTheme.size.xl} ${euiTheme.size.l} ${euiTheme.base * 4.5}px;
        gap: ${euiTheme.base * 3.75}px;
      `,
      titleStyle: css`
        font-size: ${euiTheme.base * 0.875}px;
        font-weight: ${euiTheme.font.weight.semiBold};
        line-height: ${euiTheme.size.l};
        color: ${euiTheme.colors.title};
      `,
      descriptionStyle: css`
        font-size: 12.25px;
        font-weight: ${euiTheme.font.weight.regular};
        line-height: ${euiTheme.base * 1.25}px;
        color: ${euiTheme.colors.darkestShade};
      `,
      linkStyle: css`
        font-size: ${euiTheme.size.m};
        font-weight: ${euiTheme.font.weight.medium};
        line-height: ${euiTheme.size.base};
      `,
    }),
    [
      euiTheme.base,
      euiTheme.colors.darkestShade,
      euiTheme.colors.title,
      euiTheme.font.weight.medium,
      euiTheme.font.weight.regular,
      euiTheme.font.weight.semiBold,
      euiTheme.size.base,
      euiTheme.size.l,
      euiTheme.size.m,
      euiTheme.size.xl,
    ]
  );
  return footerStyles;
};
