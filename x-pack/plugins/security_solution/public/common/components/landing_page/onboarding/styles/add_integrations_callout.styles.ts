/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiBackgroundColor, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/css';
import { useMemo } from 'react';

export const useAddIntegrationsCalloutStyles = () => {
  const { euiTheme } = useEuiTheme();
  const backgroundColor = useEuiBackgroundColor('primary');

  const customStyles = useMemo(
    () => ({
      calloutWrapperStyles: css({
        borderRadius: euiTheme.border.radius.medium,
        border: `1px solid ${euiTheme.colors.lightShade}`,
        padding: `${euiTheme.size.xs} ${euiTheme.size.m}`,
        backgroundColor,
        marginTop: euiTheme.size.base,
      }),
      calloutTitleStyles: css({
        color: euiTheme.colors.title,
        fontSize: euiTheme.size.m,
        fontWeight: euiTheme.font.weight.regular,
        lineHeight: `${euiTheme.base * 1.25}px`,
        marginLeft: euiTheme.size.xs,
      }),
      calloutAnchorStyles: css({ marginLeft: euiTheme.size.s }),
    }),
    [
      backgroundColor,
      euiTheme.base,
      euiTheme.border.radius.medium,
      euiTheme.colors.lightShade,
      euiTheme.colors.title,
      euiTheme.font.weight.regular,
      euiTheme.size.base,
      euiTheme.size.m,
      euiTheme.size.s,
      euiTheme.size.xs,
    ]
  );

  return customStyles;
};
