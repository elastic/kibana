/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { CheckBoxField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import type { CaseCustomFieldToggle } from '../../../../common/types/domain';
import type { CustomFieldType } from '../types';
import * as i18n from '../translations';

const ConfigureComponent: CustomFieldType<CaseCustomFieldToggle>['Configure'] = () => {
  return (
    <>
      <UseField
        path="options.required"
        component={CheckBoxField}
        componentProps={{
          euiFieldProps: {
            'data-test-subj': 'toggle-custom-field-options',
            label: i18n.FIELD_OPTION_REQUIRED,
          },
          label: i18n.FIELD_OPTIONS,
        }}
      />
    </>
  );
};

ConfigureComponent.displayName = 'Configure';

export const Configure = React.memo(ConfigureComponent);
