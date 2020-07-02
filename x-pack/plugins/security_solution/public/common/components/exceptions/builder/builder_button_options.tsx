/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiButton } from '@elastic/eui';
import styled from 'styled-components';

import * as i18n from '../translations';

const MyEuiButton = styled(EuiButton)`
  min-width: 95px;
`;

interface BuilderButtonOptionsProps {
  isOrDisabled: boolean;
  isAndDisabled: boolean;
  displayInitButton: boolean;
  showNestedButton: boolean;
  onAndClicked: () => void;
  onOrClicked: () => void;
  onNestedClicked: () => void;
}

export const BuilderButtonOptions: React.FC<BuilderButtonOptionsProps> = ({
  isOrDisabled = false,
  isAndDisabled = false,
  displayInitButton,
  showNestedButton = false,
  onAndClicked,
  onOrClicked,
  onNestedClicked,
}) => (
  <EuiFlexGroup gutterSize="s" alignItems="center">
    {displayInitButton ? (
      <EuiFlexItem grow={false}>
        <EuiButton
          fill
          size="s"
          iconType="plusInCircle"
          onClick={onOrClicked}
          data-test-subj="exceptionsAddNewExceptionButton"
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
            isDisabled={isOrDisabled}
            data-test-subj="exceptionsOrButton"
          >
            {i18n.OR}
          </MyEuiButton>
        </EuiFlexItem>
        {showNestedButton && (
          <EuiFlexItem grow={false}>
            <EuiButton
              size="s"
              iconType="nested"
              onClick={onNestedClicked}
              data-test-subj="exceptionsNestedButton"
            >
              {i18n.ADD_NESTED_DESCRIPTION}
            </EuiButton>
          </EuiFlexItem>
        )}
      </>
    )}
  </EuiFlexGroup>
);
