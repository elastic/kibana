/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ChangeEvent, FormEvent } from 'react';

import { useActions, useValues } from 'kea';

import { FormattedMessage } from '@kbn/i18n/react';

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
import { AddSourceLogic } from './add_source_logic';
import { CONFIG_CUSTOM_BUTTON } from './constants';

interface ConfigureCustomProps {
  header: React.ReactNode;
  helpText: string;
  advanceStep(): void;
}

export const ConfigureCustom: React.FC<ConfigureCustomProps> = ({
  helpText,
  advanceStep,
  header,
}) => {
  const { setCustomSourceNameValue } = useActions(AddSourceLogic);
  const { customSourceNameValue, buttonLoading } = useValues(AddSourceLogic);

  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    advanceStep();
  };

  const handleNameChange = (e: ChangeEvent<HTMLInputElement>) =>
    setCustomSourceNameValue(e.target.value);

  return (
    <div className="custom-api-step-1">
      {header}
      <form onSubmit={handleFormSubmit}>
        <EuiForm>
          <EuiText grow={false}>
            <p>{helpText}</p>
            <p>
              <FormattedMessage
                id="xpack.enterpriseSearch.workplaceSearch.contentSource.configCustom.docs.link"
                defaultMessage="{link} to learn more about Custom API Sources."
                values={{
                  link: (
                    <EuiLink href={CUSTOM_SOURCE_DOCS_URL} target="_blank">
                      Read the documentation
                    </EuiLink>
                  ),
                }}
              />
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
              {CONFIG_CUSTOM_BUTTON}
            </EuiButton>
          </EuiFormRow>
        </EuiForm>
      </form>
    </div>
  );
};
