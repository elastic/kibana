/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFieldText, EuiFlexGroup, EuiIcon } from '@elastic/eui';
import styled, { keyframes } from 'styled-components';

const fadeInEffect = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

export const TimelineProperties = styled.div`
  align-items: center;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  user-select: none;
  min-width: 100%;
`;

export const NameField = styled(EuiFieldText)`
  width: 150px;
  min-width: 150px;
`;

export const DescriptionField = styled(EuiFieldText)`
  margin-left: 5px;
  min-width: 350px;
  width: 350px;
  animation: ${fadeInEffect} 0.3s;
`;

export const NotesButtonLabel = styled.div`
  align-items: center;
  justify-content: space-between;
  display: flex;
`;

export const NotesIconContainer = styled.div`
  position: relative;
  margin-left: 5px;
`;

export const PositionedNotesIcon = styled.div<{ size: 'l' | 's' }>`
  left: ${({ size }) => (size === 'l' ? '-12px' : '13px')};
  overflow: visible;
  position: absolute;
  top: ${({ size }) => (size === 'l' ? '-22px' : '-19px')};
`;

export const SmallNotesButtonContainer = styled.div`
  cursor: pointer;
`;

export const ButtonContainer = styled.div<{ animate: boolean }>`
  animation: ${fadeInEffect} ${({ animate }) => (animate ? '0.3s' : '0s')};
`;

export const HistoryButtonLabel = styled.div`
  align-items: center;
  display: flex;
`;

export const LabelText = styled.div`
  margin-left: 10px;
`;

export const StyledStar = styled(EuiIcon)`
  margin-right: 10px;
  cursor: pointer;
`;

export const PropertiesLeft = styled.div`
  align-items: center;
  display: flex;
  flex-direction: row;
`;

export const PropertiesRight = styled(EuiFlexGroup)`
  margin-left: 15px;
`;

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
