/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiPanel } from '@elastic/eui';
import styled from 'styled-components';

export const EuiPanelStyled = styled(EuiPanel)<{ $bottomOffset?: string }>`
  position: fixed;
  top: 95px;
  left: 247px;
  bottom: 0;
  width: 340px;
  height: inherit;

  // If the bottom bar is visible add padding to the navigation
  ${({ $bottomOffset, theme }) =>
    $bottomOffset != null &&
    `
      height: inherit;
      bottom: ${$bottomOffset};
      box-shadow:
        // left
        -${theme.eui.euiSizeS} 0 ${theme.eui.euiSizeS} -${theme.eui.euiSizeS} rgb(0 0 0 / 15%),
        // right
        ${theme.eui.euiSizeS} 0 ${theme.eui.euiSizeS} -${theme.eui.euiSizeS} rgb(0 0 0 / 15%),
        // bottom inset to match timeline bar top shadow
        inset 0 -${theme.eui.euiSizeXS} ${theme.eui.euiSizeXS} -${theme.eui.euiSizeXS} rgb(0 0 0 / 6%);
      `}
`;

export const FlexLink = styled.a`
  display: flex;
  align-items: center;
`;
