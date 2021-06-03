/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ReactNode } from 'react';
import { StyledComponent } from 'styled-components';
import { EuiFlyout } from '@elastic/eui';
import {
  euiStyled,
  EuiTheme,
} from '../../../../../../../../../../src/plugins/kibana_react/common';

// TODO: EUI team follow up on complex types and styled-components `styled`
// https://github.com/elastic/eui/issues/4855
export const ResponsiveFlyout: StyledComponent<
  typeof EuiFlyout,
  EuiTheme,
  { children?: ReactNode }
> = euiStyled(EuiFlyout)`
  width: 100%;

  @media (min-width: 800px) {
    width: 90%;
  }

  @media (min-width: 1000px) {
    width: 80%;
  }

  @media (min-width: 1400px) {
    width: 70%;
  }

  @media (min-width: 2000px) {
    width: 60%;
  }
`;
