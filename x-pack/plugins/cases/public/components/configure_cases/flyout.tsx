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
import type { CustomFieldFormState } from '../custom_fields/form';
import type { TemplateFormState } from '../templates/form';
import type { ActionConnector, CustomFieldConfiguration } from '../../../common/types/domain';

import * as i18n from './translations';
import type { TemplateFormProps } from '../templates/types';
import type { CasesConfigurationUI } from '../../containers/types';

export interface FlyOutBodyProps<T> {
  initialValue: T;
  onChange: (state: CustomFieldFormState | TemplateFormState) => void;
  configConnectors?: ActionConnector[];
  configConnectorId?: string;
  configCustomFields?: CasesConfigurationUI['customFields'];
}

export interface FlyoutProps<T> {
  disabled: boolean;
  isLoading: boolean;
  onCloseFlyout: () => void;
  onSaveField: (data: T) => void;
  data: T;
  connectors?: ActionConnector[];
  configurationConnectorId?: string;
  configurationCustomFields?: CasesConfigurationUI['customFields'];
  renderHeader: () => React.ReactNode;
  renderBody: ({
    initialValue,
    onChange,
    configConnectors,
    configConnectorId,
    configCustomFields,
  }: FlyOutBodyProps<T>) => React.ReactNode;
}

export const CommonFlyout = <T extends CustomFieldConfiguration | TemplateFormProps | null>({
  onCloseFlyout,
  onSaveField,
  isLoading,
  disabled,
  data: initialValue,
  renderHeader,
  renderBody,
  connectors,
  configurationConnectorId,
  configurationCustomFields,
}: FlyoutProps<T>) => {
  const [formState, setFormState] = useState<CustomFieldFormState | TemplateFormState>({
    isValid: undefined,
    submit: async () => ({
      isValid: false,
      data: {},
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
          initialValue,
          configConnectors: connectors,
          configConnectorId: configurationConnectorId,
          configCustomFields: configurationCustomFields,
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
