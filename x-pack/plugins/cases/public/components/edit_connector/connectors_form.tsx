/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Form, useForm } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import React, { useEffect } from 'react';
import type { CaseConnector } from '../../../common/api';
import { ConnectorFieldsForm } from '../connectors/fields_form';
import { ConnectorFieldsPreviewForm } from '../connectors/fields_preview_form';
import type { CaseActionConnector } from '../types';

interface Props {
  currentConnectorFields: CaseConnector['fields'];
  currentActionConnector: CaseActionConnector | null;
  onChange(formState: FormState): void;
}

export interface FormState {
  isValid: boolean | undefined;
  validate(): Promise<boolean>;
  getData(): {
    fields: CaseConnector['fields'];
  };
}

const ConnectorsFormComponent: React.FC<Props> = ({
  currentActionConnector,
  currentConnectorFields,
  onChange,
}) => {
  const { form } = useForm({
    defaultValue: { fields: currentConnectorFields },
    options: { stripEmptyFields: false },
  });

  const { isValid, validate, getFormData } = form;

  // getFormData() is a stable reference that is not mutated when the form data change.
  // This means that it does not trigger a re-render on each form data change.
  useEffect(() => {
    const updatedFormState = { isValid, validate, getData: getFormData };

    console.log('mesa', getFormData);
    // Forward the state to the parent
    onChange(updatedFormState);
  }, [onChange, isValid, validate, getFormData]);

  return (
    <Form form={form}>
      <ConnectorFieldsForm connector={currentActionConnector} />
    </Form>
  );
};

ConnectorsFormComponent.displayName = 'ConnectorsForm';

export const ConnectorsForm = React.memo(ConnectorsFormComponent);
