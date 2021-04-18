/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBetaBadge, EuiText } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';

export const BetaBadgeRowWrapper = styled(EuiText)`
  display: flex;
  align-items: center;
`;

const Wrapper = styled.div`
  padding-left: ${({ theme }) => theme.eui.paddingSizes.s};
`;

const BetaBadgeComponent = () => (
  <Wrapper>
    <EuiBetaBadge
      label="Beta"
      tooltipContent="This module is not GA. Please help us by reporting any bugs."
    />
  </Wrapper>
);

export const BetaBadge = React.memo(BetaBadgeComponent);
