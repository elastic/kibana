/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { memo } from 'react';
import { euiStyled } from '@kbn/react-kibana-context-styled';
import { EuiText } from '@elastic/eui';

export const StyledEuiText = euiStyled(EuiText)`
  white-space: pre-wrap;
  line-break: anywhere;
`;

interface ShellInfoContentProps {
  content: string | number;
  textSize?: 's' | 'xs';
  title: string;
}

export const ShellInfoContent = memo<ShellInfoContentProps>(({ content, textSize, title }) => (
  <StyledEuiText size={textSize}>
    <strong>
      {title}
      {': '}
    </strong>
    {content}
  </StyledEuiText>
));

ShellInfoContent.displayName = 'ShellInfoContent';
