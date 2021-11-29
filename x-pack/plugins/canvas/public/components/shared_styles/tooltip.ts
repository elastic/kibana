/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { css } from '@emotion/react';
import { EuiThemeComputed } from '@elastic/eui';

export const tooltipStylesFactory = (theme: EuiThemeComputed) => css`
  margin-left: -${theme.size.xl};
`;
