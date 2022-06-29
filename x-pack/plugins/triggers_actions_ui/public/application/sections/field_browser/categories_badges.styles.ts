/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { css } from '@emotion/react';
import { UseEuiTheme } from '@elastic/eui';

export const styles = {
  badgesGroup: ({ euiTheme }: { euiTheme: UseEuiTheme['euiTheme'] }) => css`
    margin-top: ${euiTheme.size.xs};
    min-height: 24px;
  `,
};
