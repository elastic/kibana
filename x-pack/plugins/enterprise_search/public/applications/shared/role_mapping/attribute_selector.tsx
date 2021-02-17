/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { ANY_AUTH_PROVIDER, ANY_AUTH_PROVIDER_LABEL } from 'shared/constants/role_mappings';

import {
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';

interface IAttributeSelectorProps {
  attributeName: string;
  attributeValue?: string;
  attributes: string[];
  selectedAuthProviders?: string[];
  availableAuthProviders?: string[];
  elasticsearchRoles: string[];
  disabled: boolean;
  multipleAuthProvidersConfig: boolean;
  handleAttributeSelectorChange(value: string, elasticsearchRole: string);
  handleAttributeValueChange(value: string);
  handleAuthProviderChange?(value: string[]);
}

const attributeValueExamples = {
  username: 'elastic,*_system',
  email: 'user@example.com,*@example.org',
  metadata: '{"_reserved": true}',
};

const getAuthProviderOptions = (
  availableAuthProviders: string[]
): Array<EuiComboBoxOptionOption<string>> => {
  return [
    {
      label: 'Any current or future Auth Provider',
      options: [{ value: ANY_AUTH_PROVIDER, label: ANY_AUTH_PROVIDER_LABEL }],
    },
    {
      label: 'Select individual Auth Providers',
      options: availableAuthProviders.map((authProvider) => ({
        value: authProvider,
        label: authProvider,
      })),
    },
  ];
};

const getSelectedOptions = (
  selectedAuthProviders: string[],
  availableAuthProviders: string[]
): Array<EuiComboBoxOptionOption<string>> => {
  const groupedOptions: Array<EuiComboBoxOptionOption<string>> = getAuthProviderOptions(
    availableAuthProviders
  );
  const options: Array<EuiComboBoxOptionOption<string>> = groupedOptions.reduce(
    (acc: Array<EuiComboBoxOptionOption<string>>, n: EuiComboBoxOptionOption<string>) => [
      ...acc,
      ...(n.options || []),
    ],
    []
  );
  return options.filter((o) => o.value && selectedAuthProviders.includes(o.value));
};

export const AttributeSelector: React.FC<IAttributeSelectorProps> = ({
  attributeName,
  attributeValue = '',
  attributes,
  availableAuthProviders,
  selectedAuthProviders = [ANY_AUTH_PROVIDER],
  elasticsearchRoles,
  disabled,
  multipleAuthProvidersConfig,
  handleAttributeSelectorChange,
  handleAttributeValueChange,
  // tslint:disable-next-line:no-empty
  handleAuthProviderChange = () => null,
}) => {
  return (
    <EuiPanel
      data-test-subj="attributeSelector"
      paddingSize="l"
      className={disabled ? 'euiPanel--disabled' : ''}
    >
      <EuiTitle size="s">
        <h3>Attribute mapping</h3>
      </EuiTitle>
      <EuiSpacer />
      {availableAuthProviders && multipleAuthProvidersConfig && (
        <EuiFlexGroup alignItems="stretch">
          <EuiFlexItem>
            <EuiFormRow label="Auth Provider" fullWidth>
              <EuiComboBox
                data-test-subj="authProviderSelect"
                selectedOptions={getSelectedOptions(selectedAuthProviders, availableAuthProviders)}
                options={getAuthProviderOptions(availableAuthProviders)}
                onChange={(options) => {
                  handleAuthProviderChange(options.map((o) => o.value || ''));
                }}
                fullWidth
                isDisabled={disabled}
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem />
        </EuiFlexGroup>
      )}
      <EuiFlexGroup alignItems="stretch">
        <EuiFlexItem>
          <EuiFormRow label="External Attribute" fullWidth>
            <EuiSelect
              name="external-attribute"
              value={attributeName}
              required
              options={attributes.map((attribute) => ({ value: attribute, text: attribute }))}
              onChange={(e) => {
                handleAttributeSelectorChange(e.target.value, elasticsearchRoles[0]);
              }}
              fullWidth
              disabled={disabled}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow label="Attribute Value" fullWidth>
            {attributeName === 'role' ? (
              <EuiSelect
                value={attributeValue}
                name="elasticsearch-role"
                required
                options={elasticsearchRoles.map((elasticsearchRole) => ({
                  value: elasticsearchRole,
                  text: elasticsearchRole,
                }))}
                onChange={(e) => {
                  handleAttributeValueChange(e.target.value);
                }}
                fullWidth
                disabled={disabled}
              />
            ) : (
              <EuiFieldText
                value={attributeValue}
                name="attribute-value"
                placeholder={attributeValueExamples[attributeName]}
                onChange={(e) => {
                  handleAttributeValueChange(e.target.value);
                }}
                fullWidth
                disabled={disabled}
              />
            )}
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
