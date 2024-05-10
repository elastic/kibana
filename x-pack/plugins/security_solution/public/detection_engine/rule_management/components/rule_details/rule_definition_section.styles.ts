/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/css';
import { useMemo } from 'react';

export const filtersStyles = {
  flexGroup: css`
    max-width: 600px;
  `,
};

export const queryStyles = {
  content: css`
    white-space: pre-wrap;
  `,
};

export const useRequiredFieldsStyles = () => {
  const { euiTheme } = useEuiTheme();
  const { font } = euiTheme;

  return useMemo(
    () => ({
      fieldNameText: css`
        font-family: ${font.familyCode ?? font.family};
        display: inline;
      `,
    }),
    [font.familyCode, font.family]
  );
};
