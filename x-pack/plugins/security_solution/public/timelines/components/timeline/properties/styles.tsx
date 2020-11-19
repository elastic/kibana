/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFieldText } from '@elastic/eui';
import styled, { keyframes } from 'styled-components';

const fadeInEffect = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

export const TimelineProperties = styled.div`
  flex: 1;
  align-items: center;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  user-select: none;
`;

TimelineProperties.displayName = 'TimelineProperties';

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

export const DescriptionContainer = styled.div`
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
