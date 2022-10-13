/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { css } from '@emotion/react';
import type { ReactNode } from 'react';
import React from 'react';

interface ActionsEuiTableFormattingProps {
  children: ReactNode;
}

/*
 * Notes to future engineer:
 * We created this component because as this time EUI actions table where not allowing to pass
 * props href on an action. In our case, we want our actions to work with href
 * and onClick. Then the problem is that the design did not match with EUI example, therefore
 * we are doing some css magic to only have icon showing up when user is hovering a row
 */
export const ActionsEuiTableFormatting = React.memo<ActionsEuiTableFormattingProps>(
  ({ children }) => (
    <div
      css={css`
        .euiTableRowCell--hasActions .euiButtonEmpty .euiButtonContent {
          padding: 0px 0px;
          .euiButtonEmpty__text {
            display: none;
          }
        }
      `}
    >
      {children}
    </div>
  )
);
