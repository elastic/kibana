/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiButton } from '@elastic/eui';
import styled from 'styled-components';

import * as i18n from './translations';

const MyEuiButton = styled(EuiButton)`
  min-width: 95px;
`;

interface LogicButtonsProps {
  isOrDisabled: boolean;
  isAndDisabled: boolean;
  onAndClicked: () => void;
  onOrClicked: () => void;
}

export const LogicButtons: React.FC<LogicButtonsProps> = ({
  isOrDisabled = false,
  isAndDisabled = false,
  onAndClicked,
  onOrClicked,
}) => (
  <EuiFlexGroup gutterSize="s" alignItems="center">
    <EuiFlexItem grow={false}>
      <MyEuiButton
        fill
        size="s"
        iconType="plusInCircle"
        onClick={onAndClicked}
        data-test-subj="andButton"
        isDisabled={isAndDisabled}
      >
        {i18n.AND}
      </MyEuiButton>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <MyEuiButton
        fill
        size="s"
        iconType="plusInCircle"
        onClick={onOrClicked}
        isDisabled={isOrDisabled}
        data-test-subj="orButton"
      >
        {i18n.OR}
      </MyEuiButton>
    </EuiFlexItem>
  </EuiFlexGroup>
);
