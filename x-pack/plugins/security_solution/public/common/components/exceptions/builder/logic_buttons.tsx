/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiButton } from '@elastic/eui';
import styled from 'styled-components';

import * as i18n from './translations';
import * as i18nShared from '../translations';

const MyEuiButton = styled(EuiButton)`
  min-width: 95px;
`;

interface BuilderLogicButtonsProps {
  isOrDisabled: boolean;
  isAndDisabled: boolean;
  isNestedDisabled: boolean;
  isNested: boolean;
  showNestedButton: boolean;
  onAndClicked: () => void;
  onOrClicked: () => void;
  onNestedClicked: () => void;
  onAddClickWhenNested: () => void;
}

export const BuilderLogicButtons: React.FC<BuilderLogicButtonsProps> = ({
  isOrDisabled = false,
  isAndDisabled = false,
  showNestedButton = false,
  isNestedDisabled = true,
  isNested,
  onAndClicked,
  onOrClicked,
  onNestedClicked,
  onAddClickWhenNested,
}) => (
  <EuiFlexGroup gutterSize="s" alignItems="center">
    <EuiFlexItem grow={false}>
      <MyEuiButton
        fill
        size="s"
        iconType="plusInCircle"
        onClick={isNested ? onAddClickWhenNested : onAndClicked}
        data-test-subj="exceptionsAndButton"
        isDisabled={isAndDisabled}
      >
        {i18nShared.AND}
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
        {i18nShared.OR}
      </MyEuiButton>
    </EuiFlexItem>
    {showNestedButton && (
      <EuiFlexItem grow={false}>
        <EuiButton
          size="s"
          iconType="nested"
          onClick={isNested ? onAndClicked : onNestedClicked}
          isDisabled={isNestedDisabled}
          data-test-subj="exceptionsNestedButton"
        >
          {isNested ? i18n.ADD_NON_NESTED_DESCRIPTION : i18n.ADD_NESTED_DESCRIPTION}
        </EuiButton>
      </EuiFlexItem>
    )}
  </EuiFlexGroup>
);
