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
import { CustomFieldsForm } from '../custom_fields/form';
import { TemplateForm } from '../templates/form';
import type {
  ActionConnector,
  CustomFieldConfiguration,
  TemplateConfiguration,
} from '../../../common/types/domain';

import * as i18n from './translations';
import type { TemplateFormProps } from '../templates/types';
import type { CasesConfigurationUI } from '../../containers/types';

export interface FlyoutProps {
  disabled: boolean;
  isLoading: boolean;
  onCloseFlyout: () => void;
  onSaveField: (data: CustomFieldConfiguration | TemplateFormProps | null) => void;
  data: CustomFieldConfiguration | TemplateConfiguration | null;
  type: 'customField' | 'template';
  connectors?: ActionConnector[];
  configurationConnector?: CasesConfigurationUI['connector'];
  configurationCustomFields?: CasesConfigurationUI['customFields'];
}

const FlyoutComponent: React.FC<FlyoutProps> = ({
  onCloseFlyout,
  onSaveField,
  isLoading,
  disabled,
  data: initialValue,
  type,
  connectors,
  configurationConnector,
  configurationCustomFields,
}) => {
  const dataTestSubj = `${type}Flyout`;

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
      onSaveField(data as CustomFieldConfiguration | TemplateFormProps | null);
    }
  }, [onSaveField, submit]);

  return (
    <EuiFlyout onClose={onCloseFlyout} data-test-subj={dataTestSubj}>
      <EuiFlyoutHeader hasBorder data-test-subj={`${dataTestSubj}-header`}>
        <EuiTitle size="s">
          <h3 id="flyoutTitle">
            {type === 'customField' ? i18n.ADD_CUSTOM_FIELD : i18n.CRATE_TEMPLATE}
          </h3>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {type === 'customField' ? (
          <CustomFieldsForm
            onChange={setFormState}
            initialValue={initialValue as CustomFieldConfiguration}
          />
        ) : null}
        {type === 'template' ? (
          <TemplateForm
            onChange={setFormState}
            initialValue={initialValue as TemplateFormProps}
            connectors={connectors ?? []}
            configurationConnector={configurationConnector ?? null}
            configurationCustomFields={configurationCustomFields ?? []}
          />
        ) : null}
      </EuiFlyoutBody>
      <EuiFlyoutFooter data-test-subj={`${dataTestSubj}-footer`}>
        <EuiFlexGroup justifyContent="flexStart">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              onClick={onCloseFlyout}
              data-test-subj={`${dataTestSubj}-cancel`}
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
                data-test-subj={`${dataTestSubj}-save`}
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

FlyoutComponent.displayName = 'CommonFlyout';

export const CommonFlyout = React.memo(FlyoutComponent);
