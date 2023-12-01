/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiBackgroundColor, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { useMemo } from 'react';

export const useAddIntegrationCalloutStyles = () => {
  const { euiTheme } = useEuiTheme();
  const backgroundColor = useEuiBackgroundColor('primary');

  const calloutWrapperStyles = css`
    border-radius: ${euiTheme.border.radius.medium};
    border: 1px solid ${euiTheme.colors.lightShade};
    padding: ${euiTheme.size.xs} ${euiTheme.size.m};
    background-color: ${backgroundColor};
    margin-top: ${euiTheme.size.base};
  `;

  const calloutTitleStyles = css`
    color: ${euiTheme.colors.title};
    font-size: ${euiTheme.size.m};
    font-weight: ${euiTheme.font.weight.regular};
    line-height: ${euiTheme.base * 1.25}px;
    margin-left: ${euiTheme.size.xs};
  `;

  const customStyles = useMemo(
    () => ({ calloutWrapperStyles, calloutTitleStyles }),
    [calloutTitleStyles, calloutWrapperStyles]
  );

  return customStyles;
};
