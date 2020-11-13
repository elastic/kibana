/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFieldText, EuiFlexItem, EuiIcon } from '@elastic/eui';
import styled, { keyframes } from 'styled-components';

const fadeInEffect = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

interface WidthProp {
  width: number;
}

export const TimelineProperties = styled.div`
  flex: 1;
  align-items: center;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  user-select: none;
`;

TimelineProperties.displayName = 'TimelineProperties';

export const DatePicker = styled(EuiFlexItem).attrs<WidthProp>(({ width }) => ({
  style: {
    width: `${width}px`,
  },
}))<WidthProp>`
  .euiSuperDatePicker__flexWrapper {
    max-width: none;
    width: auto;
  }
`;
DatePicker.displayName = 'DatePicker';

export const NameField = styled(EuiFieldText)`
  .euiToolTipAnchor {
    display: block;
  }
`;
NameField.displayName = 'NameField';

export const NameWrapper = styled.div`
  .euiToolTipAnchor {
    display: block;
  }
`;
NameWrapper.displayName = 'NameWrapper';

export const DescriptionContainer = styled.div<{ marginRight?: number }>`
  animation: ${fadeInEffect} 0.3s;
  margin-right: ${({ marginRight = 5 }) => marginRight}px;
  min-width: 150px;

  .euiToolTipAnchor {
    display: block;
  }
`;
DescriptionContainer.displayName = 'DescriptionContainer';

export const ButtonContainer = styled.div<{ animate: boolean }>`
  animation: ${fadeInEffect} ${({ animate }) => (animate ? '0.3s' : '0s')};
`;
ButtonContainer.displayName = 'ButtonContainer';

export const LabelText = styled.div`
  margin-left: 10px;
`;
LabelText.displayName = 'LabelText';

export const Facet = styled.div`
  align-items: center;
  display: inline-flex;
  justify-content: center;
  border-radius: 4px;
  background: #e4e4e4;
  color: #000;
  font-size: 12px;
  line-height: 16px;
  height: 20px;
  min-width: 20px;
  padding-left: 8px;
  padding-right: 8px;
  user-select: none;
`;
Facet.displayName = 'Facet';

export const LockIconContainer = styled(EuiFlexItem)`
  margin-right: 2px;
`;
LockIconContainer.displayName = 'LockIconContainer';
