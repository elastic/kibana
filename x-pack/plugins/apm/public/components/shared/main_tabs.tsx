/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiTabs } from '@elastic/eui';
import React, { ReactNode } from 'react';
import styled from 'styled-components';

// Since our `EuiTab` components have `APMLink`s inside of them and not just
// `href`s, we need to override the color of the links inside or they will all
// be the primary color.
const StyledTabs = styled(EuiTabs)`
  padding: ${({ theme }) => `${theme.eui.gutterTypes.gutterMedium}`};
  border-bottom: ${({ theme }) => theme.eui.euiBorderThin};
`;

export function MainTabs({ children }: { children: ReactNode }) {
  return <StyledTabs display="condensed">{children}</StyledTabs>;
}
