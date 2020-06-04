/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiButton } from '@elastic/eui';
import styled from 'styled-components';

import * as i18n from './translations';

const AndOrButtonsWrapper = styled.div`
  margin: 8px 0;
`;

const MyEuiButton = styled(EuiButton)`
  min-width: 90px;
`;

interface AndOrExceptionOperatorProps {
  isAndDisabled?: boolean;
  indent?: boolean;
  displayInitButton: boolean;
  onAddExceptionClicked: () => void;
  onAndClicked: () => void;
  onOrClicked: () => void;
}

export const AndOrExceptionOperator = ({
  isAndDisabled = false,
  indent = false,
  displayInitButton,
  onAddExceptionClicked,
  onAndClicked,
  onOrClicked,
}: AndOrExceptionOperatorProps) => {
  return (
    <AndOrButtonsWrapper className={indent ? 'exceptionIndent' : ''}>
      <EuiFlexGroup gutterSize="s" alignItems="center">
        {displayInitButton ? (
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              size="s"
              iconType="plusInCircle"
              onClick={onAddExceptionClicked}
              data-test-subj="exceptionsAddNewExceptionButton"
              isDisabled={isAndDisabled}
            >
              {i18n.ADD_EXCEPTION_TITLE}
            </EuiButton>
          </EuiFlexItem>
        ) : (
          <>
            <EuiFlexItem grow={false}>
              <MyEuiButton
                fill
                size="s"
                iconType="plusInCircle"
                onClick={onAndClicked}
                data-test-subj="exceptionsAndButton"
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
                data-test-subj="exceptionsOrButton"
              >
                {i18n.OR}
              </MyEuiButton>
            </EuiFlexItem>
          </>
        )}
      </EuiFlexGroup>
    </AndOrButtonsWrapper>
  );
};
