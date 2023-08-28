/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiButton,
} from '@elastic/eui';
import {CustomFieldsForm, CustomFieldFormState} from './form';

import * as i18n from '../translations';

export interface AddFieldFlyoutProps {
  // disabled: boolean;
  isLoading: boolean;
  onCloseFlyout: () => void;
  onSaveAndAddAnotherField: () => void;
  onSaveField: (data: Record<string, unknown>) => void;
}

const AddFieldFlyoutComponent: React.FC<AddFieldFlyoutProps> = ({ onCloseFlyout, onSaveAndAddAnotherField, onSaveField, isLoading }) => {
  const dataTestSubj = 'add-custom-field-flyout';

  const [formState, setFormState] = useState<CustomFieldFormState>({
    isSubmitted: false,
    isSubmitting: false,
    isValid: undefined,
    submit: async () => ({ isValid: false, data: {} as CustomFieldFormState }),
    preSubmitValidator: null,
  });

  const { submit, isValid: isFormValid, isSubmitting } = formState;

  const handleSaveField = useCallback(
    async () => {
      const { isValid, data } = await submit();

      console.log('handleSaveField', {isValid, data} );
      onSaveField(data);
    },
    [onSaveField, submit],
  )

  return (
    <EuiFlyout onClose={onCloseFlyout} data-test-subj={dataTestSubj}>
      <EuiFlyoutHeader hasBorder data-test-subj={`${dataTestSubj}-header`}>
        <EuiTitle size="s">
          <h3 id="flyoutTitle">{i18n.ADD_CUSTOM_FIELD}</h3>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <CustomFieldsForm onChange={setFormState} />
      </EuiFlyoutBody>
      <EuiFlyoutFooter data-test-subj={`${dataTestSubj}-footer`}>
        <EuiFlexGroup justifyContent="flexStart">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onCloseFlyout} data-test-subj={`${dataTestSubj}-cancel`}>
              {i18n.CANCEL}
            </EuiButtonEmpty>
          </EuiFlexItem>
          
            <EuiFlexGroup justifyContent="flexEnd">
              <EuiFlexItem grow={false}>
                <EuiButton onClick={onSaveAndAddAnotherField} data-test-subj={`${dataTestSubj}-save-add-another`}>
                  {i18n.SAVE_AND_ADD_ANOTHER}
                </EuiButton>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton fill onClick={handleSaveField} data-test-subj={`${dataTestSubj}-save`}>
                  {i18n.SAVE_FIELD}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  )
};

AddFieldFlyoutComponent.displayName = 'AddFieldFlyout';

export const AddFieldFlyout = React.memo(AddFieldFlyoutComponent);
