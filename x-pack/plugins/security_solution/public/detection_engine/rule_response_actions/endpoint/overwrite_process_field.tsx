/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { ToggleField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import { i18n } from '@kbn/i18n';

interface OverwriteFieldProps {
  path: string;
  disabled: boolean;
  readDefaultValueOnForm: boolean;
}

const OverwriteFieldComponent = ({
  path,
  disabled,
  readDefaultValueOnForm,
}: OverwriteFieldProps) => {
  const CONFIG = useMemo(() => {
    return {
      defaultValue: true,
      label: i18n.translate('xpack.securitySolution.responseActions.endpoint.overwriteFieldLabel', {
        defaultMessage: 'Use process.pid as process identifier',
      }),
    };
  }, []);

  return (
    <UseField
      component={ToggleField}
      euiFieldProps={{
        'data-test-subj': 'config-overwrite-toggle',
      }}
      path={path}
      readDefaultValueOnForm={readDefaultValueOnForm}
      config={CONFIG}
      isDisabled={disabled}
    />
  );
};

export const OverwriteField = React.memo(OverwriteFieldComponent);
