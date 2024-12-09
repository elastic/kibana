/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import styled from '@emotion/styled';
import { css } from '@emotion/react';

import type { SerializedStyles } from '@emotion/react';
import type { EuiThemeComputed } from '@elastic/eui';
interface EntityAnalyticsRiskScorePageStyles {
  ButtonStyle: SerializedStyles;
  VerticalSeparator: ReturnType<typeof styled.div>;
  ToggleStyle: SerializedStyles;
  DatePickerStyle: SerializedStyles;
}

export const getEntityAnalyticsRiskScorePageStyles = (
  euiTheme: EuiThemeComputed
): EntityAnalyticsRiskScorePageStyles => ({
  ButtonStyle: css`
    height: ${euiTheme.size.base};
    padding: 0 ${euiTheme.size.s};
    font-size: ${euiTheme.size.m};
  `,

  VerticalSeparator: styled.div`
    :before {
      content: '';
      height: ${euiTheme.size.l};
      border-left: ${euiTheme.border.width.thin} solid ${euiTheme.colors.lightShade};
    }
  `,

  ToggleStyle: css`
    height: ${euiTheme.size.l};
    width: ${euiTheme.size.xl};
  `,

  DatePickerStyle: css`
    flex-grow: 1;
    max-width: ${euiTheme.size.xl};
    font-size: ${euiTheme.size.l};
    input {
      height: ${euiTheme.size.l};
      padding: ${euiTheme.size.s};
      border: ${euiTheme.border.width.thin} solid ${euiTheme.colors.lightShade};
      border-radius: ${euiTheme.border.radius.small};
    }
    @media (max-width: 100vw) {
      max-width: 100%;
    }
  `,
});
