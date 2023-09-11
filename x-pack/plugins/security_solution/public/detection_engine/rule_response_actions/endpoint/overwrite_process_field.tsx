/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { ToggleField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import { FormattedMessage } from '@kbn/i18n-react';

interface OverwriteFieldProps {
  path: string;
  disabled: boolean;
  readDefaultValueOnForm: boolean;
}

const CONFIG = {
  label: (
    <p>
      <FormattedMessage
        id="xpack.securitySolution.responseActions.endpoint.overwriteFieldLabel"
        defaultMessage="Use {pid} as process identifier"
        values={{
          pid: <strong>process.pid</strong>,
        }}
      />
    </p>
  ),
};

const OverwriteFieldComponent = ({
  path,
  disabled,
  readDefaultValueOnForm,
}: OverwriteFieldProps) => {
  return (
    <UseField
      component={ToggleField}
      path={path}
      readDefaultValueOnForm={readDefaultValueOnForm}
      config={CONFIG}
      isDisabled={disabled}
    />
  );
};

export const OverwriteField = React.memo(OverwriteFieldComponent);
