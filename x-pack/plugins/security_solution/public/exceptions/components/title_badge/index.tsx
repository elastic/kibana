/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import styled from 'styled-components';

import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { euiThemeVars } from '@kbn/ui-theme';

interface TitleBadgeProps {
  title: string;
  badgeString: string;
}

const StyledFlexItem = styled(EuiFlexItem)`
  border-right: 1px solid #d3dae6;
  padding: ${euiThemeVars.euiSizeXS} ${euiThemeVars.euiSizeS} ${euiThemeVars.euiSizeXS} 0;
`;

const TextContainer = styled(EuiText)`
  width: max-content;
`;

export const TitleBadge = memo<TitleBadgeProps>(({ title, badgeString }) => {
  return (
    <EuiFlexGroup alignItems="center">
      <EuiFlexItem>
        <TextContainer grow size="xs">
          {`${title}:`}
        </TextContainer>
      </EuiFlexItem>
      <StyledFlexItem>
        <EuiBadge>{badgeString}</EuiBadge>
      </StyledFlexItem>
    </EuiFlexGroup>
  );
});

TitleBadge.displayName = 'TitleBadge';
