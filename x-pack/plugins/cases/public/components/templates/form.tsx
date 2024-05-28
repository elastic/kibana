/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FormHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { Form, useForm } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import React, { useEffect, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { ActionConnector } from '../../../common/types/domain';
import { schema } from './schema';
import { FormFields } from './form_fields';
import { templateSerializer } from './utils';
import type { TemplateFormProps } from './types';
import type { CasesConfigurationUI } from '../../containers/types';

export interface TemplateFormState {
  isValid: boolean | undefined;
  submit: FormHook<TemplateFormProps | {}>['submit'];
}

interface Props {
  onChange: (state: TemplateFormState) => void;
  initialValue: TemplateFormProps | null;
  connectors: ActionConnector[];
  configurationConnectorId: string;
  configurationCustomFields: CasesConfigurationUI['customFields'];
}

const FormComponent: React.FC<Props> = ({
  onChange,
  initialValue,
  connectors,
  configurationConnectorId,
  configurationCustomFields,
}) => {
  const keyDefaultValue = useMemo(() => uuidv4(), []);

  const { form } = useForm({
    defaultValue: initialValue ?? {
      key: keyDefaultValue,
      name: '',
      templateDescription: '',
      templateTags: [],
    },
    options: { stripEmptyFields: false },
    schema,
    serializer: templateSerializer,
  });

  const { submit, isValid, isSubmitting } = form;

  useEffect(() => {
    if (onChange) {
      onChange({ isValid, submit });
    }
  }, [onChange, isValid, submit]);

  return (
    <Form form={form}>
      <FormFields
        isSubmitting={isSubmitting}
        connectors={connectors}
        configurationConnectorId={configurationConnectorId}
        configurationCustomFields={configurationCustomFields}
      />
    </Form>
  );
};

FormComponent.displayName = 'TemplateForm';

export const TemplateForm = React.memo(FormComponent);
