/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiButton,
  EuiCode,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiFieldText,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { AddDomainLogic } from './add_domain_logic';

export const AddDomainForm: React.FC = () => {
  const { setAddDomainFormInputValue, validateDomain } = useActions(AddDomainLogic);

  const { addDomainFormInputValue, entryPointValue } = useValues(AddDomainLogic);

  return (
    <>
      <EuiForm
        onSubmit={(event) => {
          event.preventDefault();
          validateDomain();
        }}
        component="form"
      >
        <EuiFormRow
          fullWidth
          label="Domain URL"
          helpText={
            <EuiText size="s">
              {i18n.translate('xpack.enterpriseSearch.appSearch.crawler.addDomainForm.helpText', {
                defaultMessage: 'Domain URLs require a protocol and cannot contain any paths.',
              })}
            </EuiText>
          }
        >
          <EuiFlexGroup>
            <EuiFlexItem grow>
              <EuiFieldText
                autoFocus
                placeholder="https://"
                value={addDomainFormInputValue}
                onChange={(e) => setAddDomainFormInputValue(e.target.value)}
                fullWidth
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton type="submit" fill disabled={addDomainFormInputValue.length === 0}>
                {i18n.translate(
                  'xpack.enterpriseSearch.appSearch.crawler.addDomainForm.validateButtonLabel',
                  {
                    defaultMessage: 'Validate Domain',
                  }
                )}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFormRow>

        {entryPointValue !== '/' && (
          <>
            <EuiSpacer />
            <EuiText size="s">
              <p>
                <strong>
                  {
                    // TODO Is there a better way to include the EuiCode inside i18n.translate?
                    i18n.translate(
                      'xpack.enterpriseSearch.appSearch.crawler.addDomainForm.entryPointLabel',
                      {
                        defaultMessage: 'Web Crawler entry point has been set as',
                      }
                    )
                  }
                </strong>{' '}
                <EuiCode>{entryPointValue}</EuiCode>
              </p>
            </EuiText>
          </>
        )}
      </EuiForm>
    </>
  );
};
