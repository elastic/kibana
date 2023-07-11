/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useFormData } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { get } from 'lodash';
import { ParentProcessField } from './parent_process_field';
import { FieldNameField } from './field_name';

interface AdditionalConfigFieldProps {
  basePath: string;
  disabled: boolean;
  readDefaultValueOnForm: boolean;
}

export const ConfigFieldsComponent = ({
  basePath,
  disabled,
  readDefaultValueOnForm,
}: AdditionalConfigFieldProps) => {
  const [data] = useFormData();
  const currentCommand = get(data, `${basePath}.command`);

  if (currentCommand === 'kill-process' || currentCommand === 'suspend-process') {
    return (
      <>
        <ParentProcessField
          path={`${basePath}.config.parent`}
          disabled={disabled}
          readDefaultValueOnForm={readDefaultValueOnForm}
        />
        <FieldNameField
          path={`${basePath}.config.field`}
          disabled={disabled}
          readDefaultValueOnForm={readDefaultValueOnForm}
        />
      </>
    );
  }

  return null;
};

export const ConfigFields = React.memo(ConfigFieldsComponent);
