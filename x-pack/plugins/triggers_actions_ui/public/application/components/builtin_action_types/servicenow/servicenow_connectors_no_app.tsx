/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFormRow, EuiLink, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '../../../../common/lib/kibana';

import { ActionConnectorFieldsProps } from '../../../../types';

import {
  ConfigFieldSchema,
  SecretsFieldSchema,
  SimpleConnectorForm,
} from '../../simple_connector_form';
import * as i18n from './translations';

const configFormSchema: ConfigFieldSchema[] = [
  { id: 'apiUrl', label: i18n.API_URL_LABEL, isUrlField: true, helpText: i18n.API_URL_HELPTEXT },
];
const secretsFormSchema: SecretsFieldSchema[] = [
  { id: 'username', label: i18n.USERNAME_LABEL },
  { id: 'password', label: i18n.PASSWORD_LABEL, isPasswordField: true },
];

const ServiceNowConnectorFieldsNoApp: React.FC<ActionConnectorFieldsProps> = ({
  isEdit,
  readOnly,
}) => {
  const { docLinks } = useKibana().services;

  return (
    <>
      <EuiFormRow fullWidth>
        <p>
          <FormattedMessage
            id="xpack.triggersActionsUI.components.builtinActionTypes.serviceNowAction.apiUrlHelpLabel"
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
      <SimpleConnectorForm
        isEdit={isEdit}
        readOnly={readOnly}
        configFormSchema={configFormSchema}
        secretsFormSchema={secretsFormSchema}
      />
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { ServiceNowConnectorFieldsNoApp as default };
