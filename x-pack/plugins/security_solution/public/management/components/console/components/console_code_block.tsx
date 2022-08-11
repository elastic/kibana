/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { memo } from 'react';
import { EuiText, EuiTextColor } from '@elastic/eui';
import { euiStyled } from '@kbn/kibana-react-plugin/common';

export const ConsoleCodeBlock = memo<{
  children: ReactNode;
  inline?: boolean;
  textColor?: 'default' | 'error' | 'success';
  bold?: boolean;
}>(({ children, inline = false, textColor = 'default', bold = false }) => {
  const baseStyledComponent = inline ? EuiTextColor : EuiText;

  const CodeBlock = euiStyled(baseStyledComponent).attrs({
    transparentBackground: true,
    size: 's',
  })`{
          color: ${(props) => {
            if (textColor === 'error') {
              return props.theme.eui.euiColorDanger;
            } else if (textColor === 'success') {
              return props.theme.eui.euiColorSuccessText;
            } else {
              return props.theme.eui.euiColorDarkestShade;
            }
          }};
          font-weight: ${(props) => {
            return bold ? props.theme.eui.euiFontWeightBold : props.theme.eui.euiFontWeightRegular;
          }};
          font-family: ${(props) => props.theme.eui.euiCodeFontFamily};
          padding: 0;
         }
      `;

  return <CodeBlock>{children}</CodeBlock>;
});
ConsoleCodeBlock.displayName = 'ConsoleCodeBlock';
