/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiFormRow, EuiLink, EuiSpacer } from '@elastic/eui';
import { UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import { TextField } from '@kbn/es-ui-shared-plugin/static/forms/components';

import { useKibana } from '@kbn/triggers-actions-ui-plugin/public';
import * as i18n from './translations';

interface Props {
  readOnly: boolean;
  isLoading: boolean;
  pathPrefix?: string;
}

const { urlField } = fieldValidators;

const CredentialsApiUrlComponent: React.FC<Props> = ({ isLoading, readOnly, pathPrefix = '' }) => {
  const { docLinks } = useKibana().services;

  return (
    <>
      <EuiFormRow fullWidth>
        <p>
          <FormattedMessage
            id="xpack.stackConnectors.components.serviceNow.apiUrlHelpLabel"
            defaultMessage="Provide the full URL to the desired ServiceNow instance. If you don't have one, {instance}."
            values={{
              instance: (
                <EuiLink href={docLinks.links.alerting.serviceNowAction} target="_blank">
                  {i18n.SETUP_DEV_INSTANCE}
                </EuiLink>
              ),
            }}
          />
        </p>
      </EuiFormRow>
      <EuiSpacer size="l" />
      <UseField
        path={`${pathPrefix}config.apiUrl`}
        component={TextField}
        config={{
          label: i18n.API_URL_LABEL,
          validations: [
            {
              validator: urlField(i18n.API_URL_INVALID),
            },
          ],
        }}
        componentProps={{
          euiFieldProps: {
            'data-test-subj': 'credentialsApiUrlFromInput',
            isLoading,
            readOnly,
            disabled: readOnly || isLoading,
          },
        }}
      />
    </>
  );
};

export const CredentialsApiUrl = memo(CredentialsApiUrlComponent);
