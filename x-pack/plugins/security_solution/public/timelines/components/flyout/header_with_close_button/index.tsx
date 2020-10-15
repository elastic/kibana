/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiToolTip, EuiButtonIcon } from '@elastic/eui';
import styled from 'styled-components';

import { FlyoutHeader } from '../header';
import * as i18n from './translations';

const FlyoutHeaderContainer = styled.div`
  align-items: center;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  width: 100%;
`;

// manually wrap the close button because EuiButtonIcon can't be a wrapped `styled`
const WrappedCloseButton = styled.div`
  margin-right: 5px;
`;

const FlyoutHeaderWithCloseButtonComponent: React.FC<{
  onClose: () => void;
  timelineId: string;
  usersViewing: string[];
}> = ({ onClose, timelineId, usersViewing }) => (
  <FlyoutHeaderContainer>
    <WrappedCloseButton>
      <EuiToolTip content={i18n.CLOSE_TIMELINE}>
        <EuiButtonIcon
          aria-label={i18n.CLOSE_TIMELINE}
          data-test-subj="close-timeline"
          iconType="cross"
          onClick={onClose}
        />
      </EuiToolTip>
    </WrappedCloseButton>
    <FlyoutHeader timelineId={timelineId} usersViewing={usersViewing} />
  </FlyoutHeaderContainer>
);

export const FlyoutHeaderWithCloseButton = React.memo(FlyoutHeaderWithCloseButtonComponent);

FlyoutHeaderWithCloseButton.displayName = 'FlyoutHeaderWithCloseButton';
