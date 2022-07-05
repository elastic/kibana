/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCode } from '@elastic/eui';
import { euiStyled } from '@kbn/kibana-react-plugin/common';

export const ConsoleCodeBlock = euiStyled(EuiCode).attrs({
  transparentBackground: true,
  paddingSize: 'none',
})`{
      color: ${(props) => props.theme.eui.euiColorDarkestShade} !important;
      font-weight: 400;
      padding: 0;
     }
  `;

export const ConsoleCodeBlockError = euiStyled(EuiCode).attrs({
  transparentBackground: true,
  paddingSize: 'none',
})`{
    color: ${(props) => props.theme.eui.euiColorDanger} !important;
    font-weight: 400;
    padding: 0;
    }
`;

export const ConsoleCodeBlockBold = euiStyled(EuiCode).attrs({
  transparentBackground: true,
  paddingSize: 'none',
})`{
      color: ${(props) => props.theme.eui.euiColorDarkestShade} !important;
      font-weight: 700;
      padding: 0;
     }
  `;
