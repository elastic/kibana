/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import styled from 'styled-components';
import { EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';

// TODO check font Roboto Mono
export const EuiFlexGroupNested = styled(EuiFlexGroup)`
  margin-left: ${({ theme }) => theme.eui.euiSizeXL};
  margin-bottom: ${({ theme }) => theme.eui.euiSizeXS};
  padding-top: ${({ theme }) => theme.eui.euiSizeXS};
`;

export const EuiFlexItemNested = styled(EuiFlexItem)`
  margin-bottom: 6px;
  margin-top: 6px;
`;

export const StyledConditionContent = styled(EuiPanel)`
  border: 1px;
  border-color: #d3dae6;
  border-style: solid;
`;

export const ValueContainer = styled.div`
  display: flex;
  align-items: center;
  margin-left: ${({ theme }) => theme.eui.euiSizeS};
`;
export const ExpressionContainer = styled.div`
  display: flex;
  align-items: center;
`;
