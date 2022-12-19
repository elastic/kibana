/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiListGroupItem, transparentize } from '@elastic/eui';
import styled from 'styled-components';

export const EuiListGroupItemStyled = styled(EuiListGroupItem)`
  font-weight: ${({ theme }) => theme.eui.euiFontWeightRegular};
  &.solutionGroupedNavItem--isPrimary * {
    font-weight: ${({ theme }) => theme.eui.euiFontWeightBold};
  }
  &:focus,
  &:focus-within,
  &:hover,
  &.solutionGroupedNavItem--isActive {
    background-color: ${({ theme }) => transparentize(theme.eui.euiColorPrimary, 0.1)};
  }
  .solutionGroupedNavItemButton:focus,
  .solutionGroupedNavItemButton:focus-within,
  .solutionGroupedNavItemButton:hover {
    transform: none; /* prevent translationY transform that causes misalignment within the list item */
    background-color: ${({ theme }) => transparentize(theme.eui.euiColorPrimary, 0.2)};
  }
`;
