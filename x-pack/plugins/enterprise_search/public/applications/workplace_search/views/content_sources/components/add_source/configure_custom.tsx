/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiButton,
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiLink,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';

import { CUSTOM_SOURCE_DOCS_URL } from '../../../../routes';
import { SourceLogic } from '../../source_logic';

interface ConfigureCustomProps {
  header: React.ReactNode;
  helpText: string;
  advanceStep();
}

export const ConfigureCustom: React.FC<ConfigureCustomProps> = ({
  helpText,
  advanceStep,
  header,
}) => {
  const { setCustomSourceNameValue } = useActions(SourceLogic);
  const { customSourceNameValue, buttonLoading } = useValues(SourceLogic);

  const handleFormSubmit = (e) => {
    e.preventDefault();
    advanceStep();
  };

  const handleNameChange = (e) => setCustomSourceNameValue(e.target.value);

  return (
    <div className="custom-api-step-1">
      {header}
      <form onSubmit={handleFormSubmit}>
        <EuiForm>
          <EuiText grow={false}>
            <p>{helpText}</p>
            <p>
              <EuiLink href={CUSTOM_SOURCE_DOCS_URL} target="_blank">
                Read the documentation
              </EuiLink>{' '}
              to learn more about Custom API Sources.
            </p>
          </EuiText>
          <EuiSpacer size="xxl" />
          <EuiFormRow label="Source Name">
            <EuiFieldText
              name="source-name"
              required
              data-test-subj="CustomSourceNameInput"
              value={customSourceNameValue}
              onChange={handleNameChange}
            />
          </EuiFormRow>
          <EuiSpacer />
          <EuiFormRow>
            <EuiButton
              color="primary"
              fill
              type="submit"
              isLoading={buttonLoading}
              data-test-subj="CreateCustomButton"
            >
              Create Custom API Source
            </EuiButton>
          </EuiFormRow>
        </EuiForm>
      </form>
    </div>
  );
};
