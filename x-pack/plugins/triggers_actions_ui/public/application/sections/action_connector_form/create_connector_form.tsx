/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';

import {
  useForm,
  Form,
  FormConfig,
  FieldConfig,
  UseField,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import { i18n } from '@kbn/i18n';

import { hasSaveActionsCapability } from '../../lib/capabilities';
import { useKibana } from '../../../common/lib/kibana';

interface ConnectorFormData {
  name: string;
  [key: string]: unknown;
}

const { emptyField } = fieldValidators;

const nameConfig: FieldConfig<{ name: string }, ConnectorFormData> = {
  label: 'Name',
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

const CreateConnectorFormComponent: React.FC = () => {
  const {
    docLinks,
    application: { capabilities },
  } = useKibana().services;
  const canSave = hasSaveActionsCapability(capabilities);

  const onFormSubmit: FormConfig<ConnectorFormData>['onSubmit'] = async (data, isValid) => {
    console.log('Form data:', data);
  };

  const { form } = useForm({ onSubmit: onFormSubmit });

  return (
    <Form form={form}>
      <UseField path="name" config={nameConfig} />
    </Form>
  );
};

export const CreateConnectorForm = memo(CreateConnectorFormComponent);
