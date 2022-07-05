/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCode, EuiText, EuiTextColor } from '@elastic/eui';
import { euiStyled } from '@kbn/kibana-react-plugin/common';

export const ConsoleCodeBlock = euiStyled(EuiText).attrs({
  transparentBackground: true,
  paddingSize: 'none',
  size: 's'
})`{
      color: ${(props) => props.theme.eui.euiColorDarkestShade} !important;
      font-weight: 400;
      font-family: ${({ theme: { eui } }) => eui.euiCodeFontFamily};
      padding: 0;
     }
  `;

export const ConsoleCodeBlockError = euiStyled(EuiTextColor).attrs({
  transparentBackground: true,
  paddingSize: 'none',
  size: 's'
})`{
    color: ${(props) => props.theme.eui.euiColorDanger} !important;
    font-family: ${({ theme: { eui } }) => eui.euiCodeFontFamily};
    font-weight: 400;
    padding: 0;
    }
`;

export const ConsoleCodeBlockBold = euiStyled(EuiTextColor).attrs({
  transparentBackground: true,
  paddingSize: 'none',
  size: 's'
})`{
      color: ${(props) => props.theme.eui.euiColorDarkestShade} !important;
      font-family: ${({ theme: { eui } }) => eui.euiCodeFontFamily};
      font-weight: 700;
      padding: 0;
     }
  `;
