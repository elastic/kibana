/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Form, UseField, useForm } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';

import { ToggleField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import { EuiFlexGroup, EuiFlexItem, EuiHorizontalRule, EuiText } from '@elastic/eui';
import type { CaseUI } from '../../../../common';
import type { CustomFieldType } from '../types';
import { UNKNOWN } from '../translations';

const EditComponent: CustomFieldType['Edit'] = ({
  customField,
  customFieldConfiguration,
  onSubmit,
  isLoading,
  canUpdate,
}) => {
  const initialValue = customField.field.value?.[0] as string;
  const title = customFieldConfiguration.label ?? UNKNOWN;

  const { form } = useForm({
    defaultValue: { value: initialValue },
  });

  const onSubmitCustomField = async () => {
    const { isValid, data } = await form.submit();

    if (isValid) {
      onSubmit({
        ...customField,
        field: { value: [data.value] },
      } as CaseUI['customFields'][number]);
    }
  };

  return (
    <EuiFlexItem grow={false}>
      <EuiFlexGroup
        alignItems="center"
        gutterSize="none"
        justifyContent="spaceBetween"
        responsive={false}
      >
        <EuiFlexItem grow={false}>
          <EuiText>
            <h4>{title}</h4>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiHorizontalRule margin="xs" />
      <EuiFlexGroup
        gutterSize="m"
        data-test-subj={`case-toggle-custom-field-${customField.key}`}
        direction="column"
      >
        <Form form={form}>
          <UseField
            path="value"
            component={ToggleField}
            onChange={onSubmitCustomField}
            componentProps={{
              euiFieldProps: {
                disabled: isLoading || !canUpdate,
                'data-test-subj': `case-toggle-custom-field-form-field-${customField.key}`,
              },
            }}
          />
        </Form>
      </EuiFlexGroup>
    </EuiFlexItem>
  );
};

EditComponent.displayName = 'Edit';

export const Edit = React.memo(EditComponent);
