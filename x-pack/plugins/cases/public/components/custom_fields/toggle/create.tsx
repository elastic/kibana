/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { ToggleField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import type { CaseCustomFieldToggle } from '../../../../common/types/domain';
import type { CustomFieldType } from '../types';

const CreateComponent: CustomFieldType<CaseCustomFieldToggle>['Create'] = ({
  customFieldConfiguration,
  isLoading,
  setDefaultValue = true,
}) => {
  const { key, label, defaultValue } = customFieldConfiguration;

  return (
    <UseField
      path={`customFields.${key}`}
      component={ToggleField}
      config={{ defaultValue: defaultValue && setDefaultValue ? defaultValue : false }}
      key={key}
      label={label}
      componentProps={{
        euiFieldProps: {
          'data-test-subj': `${key}-toggle-create-custom-field`,
          disabled: isLoading,
        },
      }}
    />
  );
};

CreateComponent.displayName = 'Create';

export const Create = React.memo(CreateComponent);
