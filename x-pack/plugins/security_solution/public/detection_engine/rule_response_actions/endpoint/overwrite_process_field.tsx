/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { ToggleField } from '@kbn/es-ui-shared-plugin/static/forms/components';

interface OverwriteFieldProps {
  path: string;
  disabled: boolean;
  readDefaultValueOnForm: boolean;
}

const CONFIG = {
  label: i18n.translate('xpack.securitySolution.responseActions.endpoint.overwriteFieldLabel', {
    defaultMessage: `Ovewrite default field`,
  }),
  helpText: (
    <FormattedMessage
      id="xpack.securitySolution.responseActions.endpoint.overwriteFieldDescription"
      defaultMessage="Enable overwritting default field (process.pid)"
    />
  ),
};

const OverwriteFieldComponent = ({
  path,
  disabled,
  readDefaultValueOnForm,
}: OverwriteFieldProps) => {
  const optionalDefaultValue = !readDefaultValueOnForm ? { defaultValue: false } : {};

  return (
    <UseField
      component={ToggleField}
      {...optionalDefaultValue}
      path={path}
      readDefaultValueOnForm={readDefaultValueOnForm}
      config={CONFIG}
      isDisabled={disabled}
    />
  );
};

export const OverwriteField = React.memo(OverwriteFieldComponent);
