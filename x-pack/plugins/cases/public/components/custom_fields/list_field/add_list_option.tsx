/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiEmptyPrompt, EuiButtonEmpty, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { css } from '@emotion/react';

import * as i18n from '../translations';

export interface Props {
  disabled: boolean;
  isLoading: boolean;
  handleAddOption: () => void;
}
const AddListOptionComponent: React.FC<Props> = ({ disabled, isLoading, handleAddOption }) => {
  const renderBody = () => (
    <EuiFlexGroup justifyContent="flexStart">
      <EuiFlexItem grow={false}>
        <h5>{i18n.LIST_VALUES_LABEL}</h5>
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  return (
    <EuiEmptyPrompt
      body={renderBody()}
      color="subdued"
      className="eui-fullWidth"
      css={css`
        max-width: 750px;
        .euiEmptyPrompt__main {
          padding: 12px;
        }
        .euiEmptyPrompt__contentInner {
          max-width: none;
        }
      `}
      actions={
        <EuiButtonEmpty
          isDisabled={disabled}
          isLoading={isLoading}
          size="s"
          onClick={handleAddOption}
          iconType="plusInCircle"
          data-test-subj="cases-add-custom-field"
        >
          {i18n.LIST_ADD_OPTION}
        </EuiButtonEmpty>
      }
    />
  );
};

AddListOptionComponent.displayName = 'AddListOption';

export const AddListOption = React.memo(AddListOptionComponent);
