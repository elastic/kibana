/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiIcon,
  EuiText,
  EuiForm,
  EuiFieldText,
  EuiFormRow,
  EuiFieldNumber,
  EuiRadioGroup,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedDate, FormattedMessage } from '@kbn/i18n-react';

interface BasicSetupFormProps {
  isLoading: boolean;
  name: string;
  user: string;
  expires: string | null;
  onChangeName: (name: string) => void;
  onChangeExpires: (expires: string | null) => void;
}
export const DEFAULT_EXPIRES_VALUE = '60';

export const BasicSetupForm: React.FC<BasicSetupFormProps> = ({
  isLoading,
  name,
  user,
  expires,
  onChangeName,
  onChangeExpires,
}) => {
  let expirationDate: Date | undefined;
  if (expires) {
    expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + parseInt(expires, 10));
  }
  return (
    <EuiForm>
      <EuiFormRow
        fullWidth
        isInvalid={!name}
        helpText={i18n.translate('xpack.enterpriseSearch.apiKey.nameFieldHelpText', {
          defaultMessage: 'A good name makes it clear what your API key does.',
        })}
        label={i18n.translate('xpack.enterpriseSearch.apiKey.nameFieldLabel', {
          defaultMessage: 'Name',
        })}
      >
        <EuiFieldText
          fullWidth
          isLoading={isLoading}
          value={name}
          onChange={(e) => onChangeName(e.currentTarget.value)}
          data-test-subj="create-api-key-name"
        />
      </EuiFormRow>
      <EuiFormRow
        fullWidth
        helpText={i18n.translate('xpack.enterpriseSearch.apiKey.userFieldHelpText', {
          defaultMessage: 'ID of the user creating the API key.',
        })}
        label={i18n.translate('xpack.enterpriseSearch.apiKey.userFieldLabel', {
          defaultMessage: 'User',
        })}
      >
        <EuiFieldText
          data-test-subj="enterpriseSearchBasicSetupFormFieldText"
          fullWidth
          disabled
          value={user}
        />
      </EuiFormRow>
      <EuiFormRow
        fullWidth
        labelAppend={
          <EuiFlexGroup gutterSize="s" justifyContent="flexEnd" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiIcon type="warning" size="s" color="subdued" />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText color="subdued" size="xs">
                {i18n.translate('xpack.enterpriseSearch.apiKey.expiresFieldHelpText', {
                  defaultMessage: 'API keys should be rotated regularly.',
                })}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        }
        label={i18n.translate('xpack.enterpriseSearch.apiKey.expiresFieldLabel', {
          defaultMessage: 'Expires',
        })}
      >
        <EuiRadioGroup
          options={[
            {
              id: 'never',
              label: i18n.translate('xpack.enterpriseSearch.apiKey.expiresField.neverLabel', {
                defaultMessage: 'Never',
              }),
              'data-test-subj': 'create-api-key-expires-never-radio',
            },
            {
              id: 'days',
              label: i18n.translate('xpack.enterpriseSearch.apiKey.expiresField.daysLabel', {
                defaultMessage: 'in days',
              }),
              'data-test-subj': 'create-api-key-expires-days-radio',
            },
          ]}
          idSelected={expires === null ? 'never' : 'days'}
          onChange={(id) => onChangeExpires(id === 'never' ? null : DEFAULT_EXPIRES_VALUE)}
          data-test-subj="create-api-key-expires-radio"
        />
      </EuiFormRow>
      {expires !== null && (
        <EuiFormRow
          fullWidth
          helpText={
            <FormattedMessage
              id="xpack.enterpriseSearch.apiKey.expiresHelpText"
              defaultMessage="This API Key will expire on {expirationDate}"
              values={{
                expirationDate: (
                  <strong>
                    <FormattedDate
                      year="numeric"
                      month="long"
                      day="numeric"
                      value={expirationDate!}
                    />
                  </strong>
                ),
              }}
            />
          }
        >
          <EuiFieldNumber
            fullWidth
            disabled={isLoading}
            append={i18n.translate('xpack.enterpriseSearch.apiKey.expiresFieldUnit', {
              defaultMessage: 'days',
            })}
            placeholder="1"
            defaultValue={expires}
            min={1}
            onChange={(e) => onChangeExpires(e.currentTarget.value)}
            data-test-subj="create-api-key-expires-days-number-field"
          />
        </EuiFormRow>
      )}
    </EuiForm>
  );
};
