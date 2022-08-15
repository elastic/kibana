/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiBetaBadge, useEuiTheme } from '@elastic/eui';
import { BETA } from '../../translations';

export const NavItemBetaBadge = () => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiBetaBadge
      label={BETA}
      size="s"
      css={css`
        margin-left: ${euiTheme.size.s};
        color: ${euiTheme.colors.text};
      `}
    />
  );
};
