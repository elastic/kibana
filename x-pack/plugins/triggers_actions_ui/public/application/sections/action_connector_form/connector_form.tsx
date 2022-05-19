/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import {
  Form,
  FormHook,
  useForm,
  useFormIsModified,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { ActionTypeModel } from '../../../types';
import { CreateConnectorForm } from './create_connector_form';
import { Connector } from './types';

export interface CreateConnectorFormState {
  isValid: boolean | undefined;
  isSubmitted: boolean;
  isSubmitting: boolean;
  submit: FormHook<Connector>['submit'];
}

interface Props {
  actionTypeModel: ActionTypeModel | null;
  connector: Connector;
  isEdit: boolean;
  /** Handler to receive state changes updates */
  onChange?: (state: CreateConnectorFormState) => void;
  /** Handler to receive update on the form "isModified" state */
  onFormModifiedChange?: (isModified: boolean) => void;
}

const ConnectorFormComponent: React.FC<Props> = ({
  actionTypeModel,
  connector,
  isEdit,
  onChange,
  onFormModifiedChange,
}) => {
  const { form } = useForm({ defaultValue: connector });
  const { submit, isValid: isFormValid, isSubmitted, isSubmitting } = form;

  const isFormModified = useFormIsModified({
    form,
    discard: ['__internal__'],
  });

  useEffect(() => {
    if (onChange) {
      onChange({ isValid: isFormValid, isSubmitted, isSubmitting, submit });
    }
  }, [onChange, isFormValid, isSubmitted, isSubmitting, submit]);

  useEffect(() => {
    if (onFormModifiedChange) {
      onFormModifiedChange(isFormModified);
    }
  }, [isFormModified, onFormModifiedChange]);

  return (
    <Form form={form}>
      <CreateConnectorForm actionTypeModel={actionTypeModel} isEdit={isEdit} />
    </Form>
  );
};

export const ConnectorForm = React.memo(ConnectorFormComponent);
