/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import styled from 'styled-components';
import React from 'react';
import { EuiTitle } from '@elastic/eui';

const StyledH5 = styled.h5`
  line-height: 1.7rem;
`;

export const ThreatSummaryTitle = (title: string) => (
  <EuiTitle size="xxxs">
    <StyledH5>{title}</StyledH5>
  </EuiTitle>
);
ThreatSummaryTitle.displayName = 'ThreatSummaryTitle';
