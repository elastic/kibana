/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { FormTestProvider } from '../../components/test_utils';
import { EncryptedFieldsCallout } from './encrypted_fields_callout';
import { render, RenderResult } from '@testing-library/react';

const renderWithSecretFields = ({
  isEdit,
  isMissingSecrets,
  numberOfSecretFields,
}: {
  isEdit: boolean;
  isMissingSecrets: boolean;
  numberOfSecretFields: number;
}): RenderResult => {
  return render(
    <FormTestProvider>
      <UseField path="config.foo" config={{ label: 'labelFoo' }} />
      {Array.from({ length: numberOfSecretFields }).map((_, index) => {
        return (
          <UseField path={`secrets.${index}`} config={{ label: `label${index}` }} key={index} />
        );
      })}
      <EncryptedFieldsCallout isEdit={isEdit} isMissingSecrets={isMissingSecrets} />
    </FormTestProvider>
  );
};

describe('EncryptedFieldsCallout', () => {
  const isCreateTests: Array<[number, string]> = [
    [1, 'Remember value label0. You must reenter it each time you edit the connector.'],
    [
      2,
      'Remember values label0 and label1. You must reenter them each time you edit the connector.',
    ],
    [
      3,
      'Remember values label0, label1, and label2. You must reenter them each time you edit the connector.',
    ],
  ];

  const isEditTests: Array<[number, string]> = [
    [1, 'Value label0 is encrypted. Please reenter value for this field.'],
    [2, 'Values label0 and label1 are encrypted. Please reenter values for these fields.'],
    [3, 'Values label0, label1, and label2 are encrypted. Please reenter values for these fields.'],
  ];

  const isMissingSecretsTests: Array<[number, string]> = [
    [
      1,
      'Sensitive information is not imported. Please enter value for the following field label0.',
    ],
    [
      2,
      'Sensitive information is not imported. Please enter values for the following fields label0 and label1.',
    ],
    [
      3,
      'Sensitive information is not imported. Please enter values for the following fields label0, label1, and label2.',
    ],
  ];

  const noSecretsTests: Array<[{ isEdit: boolean; isMissingSecrets: boolean }, string]> = [
    [{ isEdit: false, isMissingSecrets: false }, 'create-connector-secrets-callout'],
    [{ isEdit: true, isMissingSecrets: false }, 'edit-connector-secrets-callout'],
    [{ isEdit: false, isMissingSecrets: true }, 'missing-secrets-callout'],
  ];

  it.each(isCreateTests)(
    'shows the create connector callout correctly with number of secrets %d',
    (numberOfSecretFields, label) => {
      const { getByText } = renderWithSecretFields({
        isEdit: false,
        isMissingSecrets: false,
        numberOfSecretFields,
      });

      expect(getByText(label)).toBeInTheDocument();
    }
  );

  it.each(isEditTests)(
    'shows the edit connector callout correctly with number of secrets %d',
    (numberOfSecretFields, label) => {
      const { getByText } = renderWithSecretFields({
        isEdit: true,
        isMissingSecrets: false,
        numberOfSecretFields,
      });

      expect(getByText(label)).toBeInTheDocument();
    }
  );

  it.each(isMissingSecretsTests)(
    'shows the is missing secrets connector callout correctly with number of secrets %d',
    (numberOfSecretFields, label) => {
      const { getByText } = renderWithSecretFields({
        isEdit: false,
        isMissingSecrets: true,
        numberOfSecretFields,
      });

      expect(getByText(label)).toBeInTheDocument();
    }
  );

  it.each(noSecretsTests)('does not shows the callouts without secrets: %p', (props, testId) => {
    const { queryByTestId } = renderWithSecretFields({
      ...props,
      numberOfSecretFields: 0,
    });

    expect(queryByTestId(testId)).toBeFalsy();
  });
});
