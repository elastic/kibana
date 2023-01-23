/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import styled from 'styled-components';

export const GroupsUnitCount = styled.span`
  font-size: ${({ theme }) => theme.eui.euiFontSizeXS};
  font-weight: ${({ theme }) => theme.eui.euiFontWeightSemiBold};
  border-right: ${({ theme }) => theme.eui.euiBorderThin};
  margin-right: ${({ theme }) => theme.eui.euiSizeS};
  padding-right: ${({ theme }) => theme.eui.euiSizeM};
`;

export const StatsContainer = styled.span`
  font-size: ${({ theme }) => theme.eui.euiFontSizeXS};
  font-weight: ${({ theme }) => theme.eui.euiFontWeightSemiBold};
  border-right: ${({ theme }) => theme.eui.euiBorderThin};
  margin-right: ${({ theme }) => theme.eui.euiSizeS};
  padding-right: ${({ theme }) => theme.eui.euiSizeM};
  .smallDot {
    width: 3px !important;
    display: inline-block;
  }
  .euiBadge__text {
    text-align: center;
    width: 100%;
  }
`;
