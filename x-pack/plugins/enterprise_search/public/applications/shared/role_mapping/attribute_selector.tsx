/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiFieldText, EuiFormRow, EuiSelect } from '@elastic/eui';

import { AttributeName, AttributeExamples } from '../types';

import { ATTRIBUTE_VALUE_LABEL, REQUIRED_LABEL, EXTERNAL_ATTRIBUTE_LABEL } from './constants';

interface Props {
  attributeName: AttributeName;
  attributeValue?: string;
  attributeValueInvalid: boolean;
  attributes: string[];
  elasticsearchRoles: string[];
  disabled?: boolean;
  handleAttributeSelectorChange(value: string, elasticsearchRole: string): void;
  handleAttributeValueChange(value: string): void;
}

const attributeValueExamples: AttributeExamples = {
  username: 'elastic,*_system',
  email: 'user@example.com,*@example.org',
  metadata: '{"_reserved": true}',
};

export const AttributeSelector: React.FC<Props> = ({
  attributeName,
  attributeValue = '',
  attributeValueInvalid,
  attributes,
  elasticsearchRoles,
  disabled,
  handleAttributeSelectorChange,
  handleAttributeValueChange,
}) => {
  return (
    <div data-test-subj="AttributeSelector">
      <EuiFormRow label={EXTERNAL_ATTRIBUTE_LABEL} fullWidth>
        <EuiSelect
          name="external-attribute"
          data-test-subj="ExternalAttributeSelect"
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
      <EuiFormRow
        label={ATTRIBUTE_VALUE_LABEL}
        fullWidth
        helpText={attributeValueInvalid && REQUIRED_LABEL}
      >
        {attributeName === 'role' ? (
          <EuiSelect
            value={attributeValue}
            name="elasticsearch-role"
            data-test-subj="ElasticsearchRoleSelect"
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
    </div>
  );
};
