/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { TextField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

interface ActionTypeFieldProps {
  path: string;
  disabled: boolean;
  readDefaultValueOnForm: boolean;
}

const CONFIG = {
  label: i18n.translate('xpack.securitySolution.responseActions.endpoint.config.command', {
    defaultMessage: 'Command',
  }),
  helpText: (
    <FormattedMessage
      id="xpack.securitySolution.responseActions.endpoint.config.commandDescription"
      defaultMessage="A shell command to run on the host. The command must be supported by bash for Linux and macOS hosts, and cmd.exe for Windows."
    />
  ),
};

const ExecuteCommandFieldComponent = ({
  path,
  disabled,
  readDefaultValueOnForm,
}: ActionTypeFieldProps) => (
  <UseField
    path={path}
    readDefaultValueOnForm={readDefaultValueOnForm}
    config={CONFIG}
    isDisabled={disabled}
    component={TextField}
    required={true}
  />
);

export const ExecuteCommandField = React.memo(ExecuteCommandFieldComponent);
