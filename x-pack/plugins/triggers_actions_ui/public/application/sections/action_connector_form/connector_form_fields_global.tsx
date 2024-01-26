/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';

import { FieldConfig, UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import { Field, HiddenField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import { i18n } from '@kbn/i18n';

interface ConnectorFormData {
  name: string;
}

interface ConnectorFormFieldsProps {
  canSave: boolean;
}

const { emptyField } = fieldValidators;

const nameConfig: FieldConfig<{ name: string }, ConnectorFormData> = {
  label: 'Connector name',
  validations: [
    {
      validator: emptyField(
        i18n.translate(
          'xpack.triggersActionsUI.sections.actionConnectorForm.error.requiredNameText',
          {
            defaultMessage: 'Name is required.',
          }
        )
      ),
    },
  ],
};

const ConnectorFormFieldsGlobalComponent: React.FC<ConnectorFormFieldsProps> = ({ canSave }) => {
  return (
    <>
      <UseField path="id" component={HiddenField} />
      <UseField path="actionTypeId" component={HiddenField} />
      <UseField path="isDeprecated" component={HiddenField} />
      <UseField
        path="name"
        config={nameConfig}
        component={Field}
        componentProps={{
          euiFieldProps: { readOnly: !canSave, 'data-test-subj': 'nameInput', fullWidth: true },
        }}
      />
    </>
  );
};

export const ConnectorFormFieldsGlobal = memo(ConnectorFormFieldsGlobalComponent);
