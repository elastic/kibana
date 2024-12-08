/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';

export const VerticalRule = (props: React.ComponentProps<'span'>) => {
  const { euiTheme } = useEuiTheme();

  return (
    <span
      css={css`
        width: 1px;
        height: 63px;
        background-color: ${euiTheme.colors.borderBaseSubdued};
      `}
      {...props}
    />
  );
};
