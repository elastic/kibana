/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { TextField, HiddenField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import { EuiSteps } from '@elastic/eui';
import { CaseFormFields } from '../case_form_fields';
import * as i18n from './translations';

interface FormFieldsProps {
  isSubmitting?: boolean;
  isEditMode?: boolean;
}

const FormFieldsComponent: React.FC<FormFieldsProps> = ({ isSubmitting, isEditMode }) => {
  const firstStep = useMemo(
    () => ({
      title: i18n.TEMPLATE_FIELDS,
      children: (
        <>
          <UseField
            path="name"
            component={TextField}
            componentProps={{
              euiFieldProps: {
                'data-test-subj': 'template-name-input',
                fullWidth: true,
                autoFocus: true,
                isLoading: isSubmitting,
              },
            }}
          />
          <UseField
            path="description"
            component={TextField}
            componentProps={{
              euiFieldProps: {
                'data-test-subj': 'template-description-input',
                fullWidth: true,
                autoFocus: true,
                isLoading: isSubmitting,
              },
            }}
          />
        </>
      ),
    }),
    [isSubmitting]
  );

  const secondStep = useMemo(
    () => ({
      title: i18n.CASE_FIELDS,
      children: <CaseFormFields />,
    }),
    []
  );

  const allSteps = useMemo(() => [firstStep, secondStep], [firstStep, secondStep]);

  return (
    <>
      <UseField path="key" component={HiddenField} />

      <EuiSteps
        headingElement="h2"
        steps={allSteps}
        data-test-subj={'template-creation-form-steps'}
      />
    </>
  );
};

FormFieldsComponent.displayName = 'FormFields';

export const FormFields = memo(FormFieldsComponent);
