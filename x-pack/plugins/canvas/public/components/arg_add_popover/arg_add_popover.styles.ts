/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiThemeComputed } from '@elastic/eui';
import { css } from '@emotion/react';

export const argAddArgStylesFactory = (theme: EuiThemeComputed) => css`
  margin-right: -${theme.size.s};
`;

export const argAddPopoverStyles = css`
  width: 250px;
`;
