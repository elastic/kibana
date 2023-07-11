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
import { CheckBoxField } from '@kbn/es-ui-shared-plugin/static/forms/components';

interface ParentProcessFieldProps {
  path: string;
  disabled: boolean;
  readDefaultValueOnForm: boolean;
}

const CONFIG = {
  label: i18n.translate('xpack.securitySolution.responseActions.endpoint.useParentLabel', {
    defaultMessage: `Use parent's pid`,
  }),
  helpText: (
    <FormattedMessage
      id="xpack.securitySolution.responseActions.endpoint.useParentDescription"
      defaultMessage="Endpoint action will be called against process's parent instead of process itself."
    />
  ),
};

const ParentProcessFieldComponent = ({
  path,
  disabled,
  readDefaultValueOnForm,
}: ParentProcessFieldProps) => (
  <UseField
    component={CheckBoxField}
    path={path}
    readDefaultValueOnForm={readDefaultValueOnForm}
    config={CONFIG}
    isDisabled={disabled}
  />
);

export const ParentProcessField = React.memo(ParentProcessFieldComponent);
