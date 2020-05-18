/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiButton } from '@elastic/eui';
import styled from 'styled-components';

import * as i18n from './translations';

const AndOrButtonsWrapper = styled.div<{ indent: boolean }>`
  margin: ${props => (props.indent ? '8px 0 8px 46px' : '8px 0')};
`;

interface AndOrExceptionOperatorProps {
  isAndDisabled?: boolean;
  indent?: boolean;
  onAndClicked: () => void;
  onOrClicked: () => void;
}

export const AndOrExceptionOperator = ({
  isAndDisabled = false,
  indent = false,
  onAndClicked,
  onOrClicked,
}: AndOrExceptionOperatorProps) => {
  return (
    <AndOrButtonsWrapper indent={indent}>
      <EuiFlexGroup gutterSize="s" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiButton
            size="s"
            iconType="plusInCircle"
            onClick={onAndClicked}
            data-test-subj="exceptionsAndButton"
            isDisabled={isAndDisabled}
          >
            {i18n.AND}
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            size="s"
            iconType="plusInCircle"
            onClick={onOrClicked}
            data-test-subj="exceptionsOrButton"
          >
            {i18n.OR}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </AndOrButtonsWrapper>
  );
};
