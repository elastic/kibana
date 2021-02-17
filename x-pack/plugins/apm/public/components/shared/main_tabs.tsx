/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiTabs } from '@elastic/eui';
import React, { ReactNode } from 'react';
import { euiStyled } from '../../../../../../src/plugins/kibana_react/common';

// Since our `EuiTab` components have `APMLink`s inside of them and not just
// `href`s, we need to override the color of the links inside or they will all
// be the primary color.
const StyledTabs = euiStyled(EuiTabs)`
  padding: ${({ theme }) => `${theme.eui.gutterTypes.gutterMedium}`};
  border-bottom: ${({ theme }) => theme.eui.euiBorderThin};
  border-top: ${({ theme }) => theme.eui.euiBorderThin};
  background: ${({ theme }) => theme.eui.euiColorEmptyShade};
`;

export function MainTabs({ children }: { children: ReactNode }) {
  return <StyledTabs display="condensed">{children}</StyledTabs>;
}
