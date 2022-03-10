/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ChangeEvent, FormEvent } from 'react';

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
import { FormattedMessage } from '@kbn/i18n-react';

import { docLinks } from '../../../../../shared/doc_links';

import { SOURCE_NAME_LABEL } from '../../constants';

import { AddCustomSourceLogic } from './add_custom_source_logic';
import { AddSourceHeader } from './add_source_header';
import { CONFIG_CUSTOM_BUTTON, CONFIG_CUSTOM_LINK_TEXT } from './constants';

export const ConfigureCustom: React.FC = () => {
  const { setCustomSourceNameValue, createContentSource } = useActions(AddCustomSourceLogic);
  const { customSourceNameValue, buttonLoading, sourceData } = useValues(AddCustomSourceLogic);

  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    createContentSource();
  };

  const handleNameChange = (e: ChangeEvent<HTMLInputElement>) =>
    setCustomSourceNameValue(e.target.value);

  const {
    serviceType,
    configuration: { documentationUrl, helpText },
    name,
    categories = [],
  } = sourceData;

  return (
    <>
      <AddSourceHeader name={name} serviceType={serviceType} categories={categories} />
      <EuiSpacer />
      <form onSubmit={handleFormSubmit}>
        <EuiForm>
          <EuiText grow={false}>
            <p>{helpText}</p>
            <p>
              {serviceType === 'custom' ? (
                <FormattedMessage
                  id="xpack.enterpriseSearch.workplaceSearch.contentSource.configCustom.docs.link.description"
                  defaultMessage="{link} to learn more about Custom API Sources."
                  values={{
                    link: (
                      <EuiLink href={docLinks.workplaceSearchCustomSources} target="_blank">
                        {CONFIG_CUSTOM_LINK_TEXT}
                      </EuiLink>
                    ),
                  }}
                />
              ) : (
                <FormattedMessage
                  id="xpack.enterpriseSearch.workplaceSearch.contentSource.configCustom.deploymentDocs.link.description"
                  defaultMessage="{link} to learn more about deploying a {name} source."
                  values={{
                    link: (
                      <EuiLink target="_blank" href={documentationUrl}>
                        {CONFIG_CUSTOM_LINK_TEXT}
                      </EuiLink>
                    ),
                    name,
                  }}
                />
              )}
            </p>
          </EuiText>
          <EuiSpacer size="xxl" />
          <EuiFormRow label={SOURCE_NAME_LABEL}>
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
              {serviceType === 'custom' ? (
                CONFIG_CUSTOM_BUTTON
              ) : (
                <FormattedMessage
                  id="xpack.enterpriseSearch.workplaceSearch.contentSource.configCustom.createNamedSourceButtonLabel"
                  defaultMessage="Create {name} source"
                  values={{
                    name,
                  }}
                />
              )}
            </EuiButton>
          </EuiFormRow>
        </EuiForm>
      </form>
    </>
  );
};
