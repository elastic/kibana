/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFlexItem, EuiText } from '@elastic/eui';
import { euiStyled } from '../../../../../observability/public';

const StyledLabel = euiStyled(EuiFlexItem).attrs({ grow: false })`
  flex-direction: row;
  align-items: center;
  margin-right: ${(props) => props.theme.eui.euiSizeXS} !important;
  margin-bottom: 6px!important;
  padding: ${(props) => props.theme.eui.euiSizeS};
  background-color: ${(props) => props.theme.eui.euiColorLightestShade};
  border-radius: ${(props) => props.theme.eui.euiBorderRadius};
  color: ${(props) => props.theme.eui.euiTitleColor};
`;

export const ExpressionRowLabel: React.FC = ({ children }) => (
  <StyledLabel>
    <EuiText size="xs">
      <strong>{children}</strong>
    </EuiText>
  </StyledLabel>
);
