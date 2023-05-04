/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

export const useExpandedRowCss = () => {
  const { euiTheme } = useEuiTheme();

  return css({
    width: '100%',
    paddingLeft: `calc(${euiTheme.size.base} * 3)`,
  });
};
