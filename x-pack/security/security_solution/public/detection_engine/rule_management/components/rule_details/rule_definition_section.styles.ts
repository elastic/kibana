/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/css';
import { useMemo } from 'react';

export const useFiltersStyles = () => {
  return useMemo(
    () => ({
      flexGroup: css`
        max-width: 600px;
      `,
    }),
    []
  );
};

export const useQueryStyles = () => {
  return useMemo(
    () => ({
      content: css`
        white-space: pre-wrap;
      `,
    }),
    []
  );
};

export const useRequiredFieldsStyles = () => {
  const { euiTheme } = useEuiTheme();
  return useMemo(
    () => ({
      fieldTypeText: css({
        fontFamily: euiTheme.font.familyCode,
        display: 'inline',
      }),
    }),
    [euiTheme.font.familyCode]
  );
};
