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
import type { FormHook, FormData } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib/types';

import * as i18n from './translations';

export interface FormState<T extends FormData = FormData> {
  isValid: boolean | undefined;
  submit: FormHook<T>['submit'];
}

export interface FlyOutBodyProps<T extends FormData = FormData> {
  onChange: (state: FormState<T>) => void;
}

export interface FlyoutProps<T extends FormData = FormData> {
  disabled: boolean;
  isLoading: boolean;
  onCloseFlyout: () => void;
  onSaveField: (data: T) => void;
  renderHeader: () => React.ReactNode;
  renderBody: ({ onChange }: FlyOutBodyProps<T>) => React.ReactNode;
}

export const CommonFlyout = <T extends FormData = FormData>({
  onCloseFlyout,
  onSaveField,
  isLoading,
  disabled,
  renderHeader,
  renderBody,
}: FlyoutProps<T>) => {
  const [formState, setFormState] = useState<FormState<T>>({
    isValid: undefined,
    submit: async () => ({
      isValid: false,
      data: {} as T,
    }),
  });

  const { submit } = formState;

  const handleSaveField = useCallback(async () => {
    const { isValid, data } = await submit();

    if (isValid) {
      onSaveField(data as T);
    }
  }, [onSaveField, submit]);

  return (
    <EuiFlyout onClose={onCloseFlyout} data-test-subj="common-flyout">
      <EuiFlyoutHeader hasBorder data-test-subj="common-flyout-header">
        <EuiTitle size="s">
          <h3 id="flyoutTitle">{renderHeader()}</h3>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {renderBody({
          onChange: setFormState,
        })}
      </EuiFlyoutBody>
      <EuiFlyoutFooter data-test-subj={'common-flyout-footer'}>
        <EuiFlexGroup justifyContent="flexStart">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              onClick={onCloseFlyout}
              data-test-subj={'common-flyout-cancel'}
              disabled={disabled}
              isLoading={isLoading}
            >
              {i18n.CANCEL}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexGroup justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                onClick={handleSaveField}
                data-test-subj={'common-flyout-save'}
                disabled={disabled}
                isLoading={isLoading}
              >
                {i18n.SAVE}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};

CommonFlyout.displayName = 'CommonFlyout';
