/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import styled from '@emotion/styled';

import { useEuiTheme } from '@elastic/eui';
import React from 'react';

export const VerticalSeparator = () => {
  const { euiTheme } = useEuiTheme();

  const Separator = styled.div`
    :before {
      content: '';
      height: ${euiTheme.size.m};
      border-left: ${euiTheme.border.width.thin} solid ${euiTheme.colors.lightShade};
    }
  `;

  return <Separator />;
};
